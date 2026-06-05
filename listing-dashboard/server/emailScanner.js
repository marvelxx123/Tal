const { ImapFlow } = require('imapflow');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// ── LoopNet email parser ──────────────────────────────────────────────────────
// LoopNet alert emails contain listing blocks like:
//   "123 Main St, Los Angeles, CA 90001"
//   Property type, price, sqft, days on market

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function parseLoopNetEmail(text) {
  const listings = [];

  // Pattern 1: "Address, City, State ZIP" lines typical of LoopNet alerts
  // e.g.  "4924 E First Coast Hwy, Fernandina Beach, FL 32034"
  const addrRegex = /(\d+[^,\n]{3,60}),\s*([A-Za-z\s]{2,40}),\s*([A-Z]{2})\s*(\d{5})?/g;
  let m;
  const seen = new Set();

  while ((m = addrRegex.exec(text)) !== null) {
    const address = m[1].trim();
    const city    = m[2].trim();
    const state   = m[3].trim().toUpperCase();
    const zip     = m[4] || '';
    const key     = `${address}|${city}|${state}`;

    if (!US_STATES.includes(state)) continue;
    if (seen.has(key)) continue;
    seen.add(key);

    // Look for price nearby (within 400 chars after address)
    const chunk = text.slice(m.index, m.index + 400);
    const priceMatch  = chunk.match(/\$[\d,]+(?:\.\d+)?[KkMm]?/);
    const sqftMatch   = chunk.match(/([\d,]+)\s*(?:sf|sq\.?\s*ft)/i);
    const typeMatch   = chunk.match(/\b(Office|Retail|Industrial|Warehouse|Mixed Use|Restaurant|Medical|Land|Flex|Multifamily)\b/i);
    const domMatch    = chunk.match(/(\d+)\s*(?:days?\s*on\s*market|DOM)/i);

    const rawPrice = priceMatch ? priceMatch[0].replace(/[$,]/g, '') : null;
    let price = null;
    if (rawPrice) {
      const n = parseFloat(rawPrice);
      price = rawPrice.toLowerCase().endsWith('m') ? n * 1_000_000
            : rawPrice.toLowerCase().endsWith('k') ? n * 1_000
            : n;
    }

    listings.push({
      property_address: address,
      city,
      state,
      zip,
      property_type: typeMatch ? typeMatch[1] : 'Commercial',
      asking_price:  price,
      square_feet:   sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null,
      days_on_market: domMatch ? parseInt(domMatch[1]) : null,
    });
  }

  return listings;
}

function parseCrexiEmail(text) {
  // Crexi alerts have similar format — reuse same parser
  return parseLoopNetEmail(text);
}

function parseEmail(subject, text) {
  const s = subject.toLowerCase();
  if (s.includes('loopnet') || s.includes('loop net')) return parseLoopNetEmail(text);
  if (s.includes('crexi')) return parseCrexiEmail(text);
  // Generic fallback — try anyway
  return parseLoopNetEmail(text);
}

// ── Save a parsed listing to DB ───────────────────────────────────────────────

function saveListing(parsed, emailImportId) {
  const bizName = `${parsed.property_address} — ${parsed.city}`;

  // Check if listing already exists
  const existing = db.prepare(
    `SELECT id FROM listings WHERE property_address = ? AND city = ? AND state = ?`
  ).get(parsed.property_address, parsed.city, parsed.state);
  if (existing) return { created: false, id: existing.id };

  // Create business record
  const bizId = uuidv4();
  db.prepare(`
    INSERT INTO businesses (id, business_name, notes)
    VALUES (?, ?, ?)
  `).run(bizId, bizName, `Auto-imported from email alert. Import ID: ${emailImportId}`);

  // Estimate listed date from days-on-market if available
  let listedDate = new Date().toISOString().slice(0, 10);
  if (parsed.days_on_market) {
    const d = new Date(Date.now() - parsed.days_on_market * 86400000);
    listedDate = d.toISOString().slice(0, 10);
  } else {
    // Default: assume 35 days ago (why else would you be alerting on it)
    const d = new Date(Date.now() - 35 * 86400000);
    listedDate = d.toISOString().slice(0, 10);
  }

  const listId = uuidv4();
  db.prepare(`
    INSERT INTO listings (id, business_id, property_address, city, state, zip, property_type, square_feet, asking_price, listed_date, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(
    listId, bizId,
    parsed.property_address, parsed.city, parsed.state, parsed.zip || '',
    parsed.property_type || 'Commercial',
    parsed.square_feet || null,
    parsed.asking_price || null,
    listedDate,
    `Auto-imported from email alert. ${parsed.days_on_market ? `${parsed.days_on_market} days on market at time of import.` : ''}`
  );

  // Log it
  db.prepare(`
    INSERT INTO activity_log (id, listing_id, business_id, action_type, notes)
    VALUES (?, ?, ?, 'Note', ?)
  `).run(uuidv4(), listId, bizId, 'Listing auto-imported from LoopNet/Crexi email alert.');

  return { created: true, id: listId };
}

// ── Main scanner ──────────────────────────────────────────────────────────────

async function scanInbox(config) {
  const { gmail_user, gmail_app_password } = config;

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: gmail_user, pass: gmail_app_password },
    logger: false,
  });

  const results = { scanned: 0, new_listings: 0, errors: [] };

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    // Search for LoopNet/Crexi alert emails from last 7 days not yet processed
    const since = new Date(Date.now() - 7 * 86400000);
    const messages = await client.search({
      or: [
        { from: 'loopnet.com' },
        { from: 'crexi.com' },
        { subject: 'commercial listing' },
        { subject: 'new listing alert' },
      ],
      since,
    });

    for (const seq of messages) {
      try {
        const msg = await client.fetchOne(seq, { source: true, envelope: true });
        const raw = msg.source.toString('utf8');
        const subject = msg.envelope?.subject || '';
        const gmailId = msg.envelope?.messageId || `seq-${seq}`;

        // Skip already-imported emails
        const alreadyDone = db.prepare('SELECT id FROM email_imports WHERE gmail_message_id = ?').get(gmailId);
        if (alreadyDone) continue;

        // Strip HTML tags for text parsing
        const text = raw
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
          .replace(/&#\d+;/g, ' ')
          .replace(/\s{2,}/g, ' ');

        const parsed = parseEmail(subject, text);

        // Record the import attempt
        const importId = uuidv4();
        db.prepare(`
          INSERT INTO email_imports (id, gmail_message_id, subject, listings_found, listings_created, raw_snippet)
          VALUES (?, ?, ?, ?, 0, ?)
        `).run(importId, gmailId, subject, parsed.length, text.slice(0, 500));

        let created = 0;
        for (const listing of parsed) {
          const r = saveListing(listing, importId);
          if (r.created) created++;
        }

        db.prepare('UPDATE email_imports SET listings_created = ? WHERE id = ?').run(created, importId);

        results.scanned++;
        results.new_listings += created;
      } catch (err) {
        results.errors.push(err.message);
      }
    }

    await client.logout();
  } catch (err) {
    results.errors.push(err.message);
    try { await client.logout(); } catch (_) {}
  }

  return results;
}

module.exports = { scanInbox, parseEmail };
