const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

const db = new Database(path.join(DATA_DIR, 'listings.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    property_address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    zip TEXT,
    property_type TEXT,
    square_feet INTEGER,
    asking_price REAL,
    description TEXT,
    listed_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (business_id) REFERENCES businesses(id)
  );

  CREATE TABLE IF NOT EXISTS listing_photos (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    caption TEXT,
    source TEXT DEFAULT 'uploaded',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (listing_id) REFERENCES listings(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    business_id TEXT,
    action_type TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_imports (
    id TEXT PRIMARY KEY,
    gmail_message_id TEXT UNIQUE,
    subject TEXT,
    imported_at TEXT DEFAULT (datetime('now')),
    listings_found INTEGER DEFAULT 0,
    listings_created INTEGER DEFAULT 0,
    raw_snippet TEXT
  );
`);

module.exports = db;
