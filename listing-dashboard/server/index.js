const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = 3001;

const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Businesses ──────────────────────────────────────────────────────────────

app.get('/api/businesses', (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, COUNT(l.id) AS listing_count
    FROM businesses b
    LEFT JOIN listings l ON l.business_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).all();
  res.json(rows);
});

app.post('/api/businesses', (req, res) => {
  const { business_name, contact_name, contact_email, contact_phone, notes } = req.body;
  if (!business_name) return res.status(400).json({ error: 'business_name required' });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO businesses (id, business_name, contact_name, contact_email, contact_phone, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, business_name, contact_name, contact_email, contact_phone, notes);
  res.json(db.prepare('SELECT * FROM businesses WHERE id = ?').get(id));
});

app.put('/api/businesses/:id', (req, res) => {
  const { business_name, contact_name, contact_email, contact_phone, notes } = req.body;
  db.prepare(`
    UPDATE businesses SET business_name=?, contact_name=?, contact_email=?, contact_phone=?, notes=?
    WHERE id=?
  `).run(business_name, contact_name, contact_email, contact_phone, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id));
});

app.delete('/api/businesses/:id', (req, res) => {
  db.prepare('DELETE FROM businesses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Listings ─────────────────────────────────────────────────────────────────

app.get('/api/listings', (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, b.business_name,
      CAST((julianday('now') - julianday(l.listed_date)) AS INTEGER) AS days_on_market,
      COUNT(p.id) AS photo_count
    FROM listings l
    LEFT JOIN businesses b ON b.id = l.business_id
    LEFT JOIN listing_photos p ON p.listing_id = l.id
    GROUP BY l.id
    ORDER BY l.listed_date ASC
  `).all();
  res.json(rows);
});

app.get('/api/listings/:id', (req, res) => {
  const listing = db.prepare(`
    SELECT l.*, b.business_name,
      CAST((julianday('now') - julianday(l.listed_date)) AS INTEGER) AS days_on_market
    FROM listings l
    LEFT JOIN businesses b ON b.id = l.business_id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not found' });
  const photos = db.prepare('SELECT * FROM listing_photos WHERE listing_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...listing, photos });
});

app.post('/api/listings', (req, res) => {
  const { business_id, property_address, city, state, zip, property_type, square_feet, asking_price, description, listed_date, status } = req.body;
  if (!business_id || !property_address || !city || !listed_date) {
    return res.status(400).json({ error: 'business_id, property_address, city, listed_date required' });
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO listings (id, business_id, property_address, city, state, zip, property_type, square_feet, asking_price, description, listed_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, business_id, property_address, city, state, zip, property_type, square_feet || null, asking_price || null, description, listed_date, status || 'active');
  res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(id));
});

app.put('/api/listings/:id', (req, res) => {
  const { property_address, city, state, zip, property_type, square_feet, asking_price, description, listed_date, status } = req.body;
  db.prepare(`
    UPDATE listings SET property_address=?, city=?, state=?, zip=?, property_type=?, square_feet=?, asking_price=?, description=?, listed_date=?, status=?
    WHERE id=?
  `).run(property_address, city, state, zip, property_type, square_feet || null, asking_price || null, description, listed_date, status, req.params.id);
  res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id));
});

app.delete('/api/listings/:id', (req, res) => {
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Photos ────────────────────────────────────────────────────────────────────

app.post('/api/listings/:id/photos/upload', upload.array('photos', 20), (req, res) => {
  const photos = req.files.map(file => {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO listing_photos (id, listing_id, filename, caption, source)
      VALUES (?, ?, ?, ?, 'uploaded')
    `).run(id, req.params.id, file.filename, req.body.caption || '');
    return db.prepare('SELECT * FROM listing_photos WHERE id = ?').get(id);
  });
  res.json(photos);
});

// Generate image via Pollinations.ai and save it
app.post('/api/listings/:id/photos/generate', async (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'listing not found' });

  const { prompt: customPrompt } = req.body;
  const base = `commercial real estate exterior photo, ${listing.property_type || 'commercial building'}, ${listing.property_address} ${listing.city}, professional real estate photography, daylight, high quality`;
  const prompt = customPrompt || base;

  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${Date.now()}`;

  const filename = `${uuidv4()}.jpg`;
  const filepath = path.join(UPLOADS_DIR, filename);

  try {
    await downloadFile(imageUrl, filepath);
    const id = uuidv4();
    db.prepare(`
      INSERT INTO listing_photos (id, listing_id, filename, caption, source)
      VALUES (?, ?, ?, ?, 'ai-generated')
    `).run(id, req.params.id, filename, prompt, 'ai-generated');
    res.json(db.prepare('SELECT * FROM listing_photos WHERE id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: `Image generation failed: ${err.message}` });
  }
});

app.delete('/api/photos/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM listing_photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'not found' });
  try { fs.unlinkSync(path.join(UPLOADS_DIR, photo.filename)); } catch (_) {}
  db.prepare('DELETE FROM listing_photos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Activity Log ──────────────────────────────────────────────────────────────

app.get('/api/activity', (req, res) => {
  const { listing_id, business_id } = req.query;
  let query = `
    SELECT a.*, l.property_address, l.city, b.business_name
    FROM activity_log a
    LEFT JOIN listings l ON l.id = a.listing_id
    LEFT JOIN businesses b ON b.id = a.business_id
  `;
  const params = [];
  if (listing_id) { query += ' WHERE a.listing_id = ?'; params.push(listing_id); }
  else if (business_id) { query += ' WHERE a.business_id = ?'; params.push(business_id); }
  query += ' ORDER BY a.created_at DESC LIMIT 200';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/activity', (req, res) => {
  const { listing_id, business_id, action_type, contact_name, contact_email, contact_phone, notes } = req.body;
  if (!action_type) return res.status(400).json({ error: 'action_type required' });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO activity_log (id, listing_id, business_id, action_type, contact_name, contact_email, contact_phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, listing_id || null, business_id || null, action_type, contact_name || '', contact_email || '', contact_phone || '', notes || '');
  res.json(db.prepare('SELECT * FROM activity_log WHERE id = ?').get(id));
});

app.delete('/api/activity/:id', (req, res) => {
  db.prepare('DELETE FROM activity_log WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── URL Import (parse LoopNet / Crexi URL) ────────────────────────────────────

app.post('/api/parse-url', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const u = new URL(url);
    const hostname = u.hostname.toLowerCase();
    let result = { source_url: url, property_address: '', city: '', state: '', property_type: '', source: '' };

    if (hostname.includes('loopnet.com')) {
      result.source = 'LoopNet';
      // URL format: /Listing/4924-E-First-Coast-Hwy-Fernandina-Beach-FL/31467834/
      const match = u.pathname.match(/\/Listing\/([^/]+)\/(\d+)/i);
      if (match) {
        result.loopnet_id = match[2];
        const slug = match[1]; // e.g. "4924-E-First-Coast-Hwy-Fernandina-Beach-FL"
        const parsed = parseAddressSlug(slug);
        Object.assign(result, parsed);
      }
    } else if (hostname.includes('crexi.com')) {
      result.source = 'Crexi';
      // URL format: /properties/123456/property-name-city-state
      const match = u.pathname.match(/\/properties\/(\d+)\/([^/]+)/i);
      if (match) {
        result.crexi_id = match[1];
        const slug = match[2];
        const parsed = parseAddressSlug(slug);
        Object.assign(result, parsed);
      }
    } else {
      // Generic — try to parse anything from the path
      result.source = 'Other';
      const slug = u.pathname.split('/').filter(Boolean).join('-');
      const parsed = parseAddressSlug(slug);
      Object.assign(result, parsed);
    }

    res.json(result);
  } catch (e) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});

function parseAddressSlug(slug) {
  // Slug like "4924-E-First-Coast-Hwy-Fernandina-Beach-FL"
  // or "123-Main-St-Los-Angeles-CA"
  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  const parts = slug.replace(/-+/g, ' ').split(' ');

  // Find state (2-letter uppercase match at end)
  let stateIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (US_STATES.includes(parts[i].toUpperCase())) { stateIdx = i; break; }
  }

  const state = stateIdx >= 0 ? parts[stateIdx].toUpperCase() : '';

  // City is 1-3 words before state
  let cityStart = Math.max(0, stateIdx - 3);
  // Find where the city starts: look for word that starts with uppercase after address ends
  // Simple heuristic: address ends with common suffixes
  const SUFFIXES = ['ST','AVE','BLVD','HWY','RD','DR','LN','CT','PL','WAY','PKWY','SQ','TER','CIR','LOOP'];
  let addrEnd = 0;
  for (let i = 0; i < (stateIdx > 0 ? stateIdx : parts.length); i++) {
    if (SUFFIXES.includes(parts[i].toUpperCase())) addrEnd = i;
  }

  const addressParts = parts.slice(0, addrEnd + 1);
  const cityParts = stateIdx > 0 ? parts.slice(addrEnd + 1, stateIdx) : [];

  return {
    property_address: addressParts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
    city: cityParts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
    state,
  };
}

// ── Export / Backup ───────────────────────────────────────────────────────────

app.get('/api/export/csv', (req, res) => {
  const listings = db.prepare(`
    SELECT l.*, b.business_name, b.contact_name, b.contact_email, b.contact_phone,
      CAST((julianday('now') - julianday(l.listed_date)) AS INTEGER) AS days_on_market,
      COUNT(p.id) AS photo_count
    FROM listings l
    LEFT JOIN businesses b ON b.id = l.business_id
    LEFT JOIN listing_photos p ON p.listing_id = l.id
    GROUP BY l.id
    ORDER BY l.listed_date ASC
  `).all();

  const cols = ['property_address','city','state','zip','property_type','square_feet','asking_price','listed_date','days_on_market','status','business_name','contact_name','contact_email','contact_phone','photo_count','description','created_at'];
  const header = cols.join(',');
  const rows = listings.map(l => cols.map(c => {
    const v = l[c] ?? '';
    return `"${String(v).replace(/"/g, '""')}"`;
  }).join(','));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="cre-listings-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send([header, ...rows].join('\n'));
});

app.get('/api/export/json', (req, res) => {
  const data = {
    exported_at: new Date().toISOString(),
    businesses: db.prepare('SELECT * FROM businesses ORDER BY created_at DESC').all(),
    listings: db.prepare(`SELECT l.*, CAST((julianday('now') - julianday(l.listed_date)) AS INTEGER) AS days_on_market FROM listings l ORDER BY l.listed_date ASC`).all(),
    photos: db.prepare('SELECT * FROM listing_photos ORDER BY created_at DESC').all(),
    activity: db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC').all(),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="cre-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(data);
});

// ── Stats ─────────────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM listings WHERE status = "active"').get().c;
  const stale = db.prepare(`SELECT COUNT(*) as c FROM listings WHERE status = "active" AND CAST((julianday('now') - julianday(listed_date)) AS INTEGER) >= 30`).get().c;
  const businesses = db.prepare('SELECT COUNT(*) as c FROM businesses').get().c;
  const photos = db.prepare('SELECT COUNT(*) as c FROM listing_photos').get().c;
  res.json({ total_active: total, stale_30_plus: stale, total_businesses: businesses, total_photos: photos });
});

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
