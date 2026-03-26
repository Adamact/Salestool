import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'salestool.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    title TEXT,
    industry TEXT,
    city TEXT,
    status TEXT DEFAULT 'new',
    priority INTEGER DEFAULT 0,
    custom_fields TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS call_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL,
    notes TEXT,
    called_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS manuscript (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    name TEXT,
    title TEXT,
    phone TEXT,
    phone_mobile TEXT,
    email TEXT,
    department TEXT,
    linkedin TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: move existing contact data from leads to contacts table
const existingContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
if (existingContacts.count === 0) {
  const leadsWithContacts = db.prepare(
    `SELECT id, contact_name, phone, email, title FROM leads
     WHERE contact_name IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL OR title IS NOT NULL`
  ).all();

  if (leadsWithContacts.length > 0) {
    const insertContact = db.prepare(
      `INSERT INTO contacts (lead_id, name, title, phone, email, is_primary)
       VALUES (@lead_id, @name, @title, @phone, @email, 1)`
    );

    const migrateAll = db.transaction(() => {
      for (const lead of leadsWithContacts) {
        if (lead.contact_name || lead.phone || lead.email || lead.title) {
          insertContact.run({
            lead_id: lead.id,
            name: lead.contact_name,
            title: lead.title,
            phone: lead.phone,
            email: lead.email,
          });
        }
      }
    });

    migrateAll();
    console.log(`Migrated ${leadsWithContacts.length} contacts from leads table`);
  }
}

// Migrations: add callback_time and duration_seconds to call_history
try {
  db.prepare("SELECT callback_time FROM call_history LIMIT 0").get();
} catch {
  db.exec("ALTER TABLE call_history ADD COLUMN callback_time DATETIME");
}
try {
  db.prepare("SELECT duration_seconds FROM call_history LIMIT 0").get();
} catch {
  db.exec("ALTER TABLE call_history ADD COLUMN duration_seconds INTEGER");
}

// Migration: add unique index on company name (case-insensitive)
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_company_unique
  ON leads (TRIM(LOWER(company)))
  WHERE company IS NOT NULL AND TRIM(company) != ''
`);

export default db;
