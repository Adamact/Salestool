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

// Custom Unicode-aware LOWER function for case-insensitive search with å, ä, ö
db.function('LOWER_UNICODE', (str) => str ? str.toLowerCase() : str);

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

  CREATE TABLE IF NOT EXISTS manuscripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
const callHistoryCols = db.prepare("PRAGMA table_info(call_history)").all().map(c => c.name);
if (!callHistoryCols.includes('callback_time')) {
  db.exec("ALTER TABLE call_history ADD COLUMN callback_time DATETIME");
}
if (!callHistoryCols.includes('duration_seconds')) {
  db.exec("ALTER TABLE call_history ADD COLUMN duration_seconds INTEGER");
}

// Migration: add manuscript_id FK to manuscript table
const manuscriptCols = db.prepare("PRAGMA table_info(manuscript)").all().map(c => c.name);
if (!manuscriptCols.includes('manuscript_id')) {
  db.exec("ALTER TABLE manuscript ADD COLUMN manuscript_id INTEGER REFERENCES manuscripts(id) ON DELETE CASCADE");
}

// Migration: backfill manuscripts parent table
const manuscriptsCount = db.prepare('SELECT COUNT(*) as count FROM manuscripts').get();
if (manuscriptsCount.count === 0) {
  const insertGroup = db.prepare('INSERT INTO manuscripts (name, is_active) VALUES (?, 1)');
  const info = insertGroup.run('Standard');
  db.prepare('UPDATE manuscript SET manuscript_id = ? WHERE manuscript_id IS NULL').run(info.lastInsertRowid);
}

// Ensure list_leads table exists before indexing (also created in routes/lists.js)
db.exec(`
  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS list_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, lead_id)
  );
`);

// Performance indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
  CREATE INDEX IF NOT EXISTS idx_call_history_lead_id ON call_history(lead_id);
  CREATE INDEX IF NOT EXISTS idx_call_history_called_at ON call_history(called_at);
  CREATE INDEX IF NOT EXISTS idx_list_leads_lead_id ON list_leads(lead_id);
  CREATE INDEX IF NOT EXISTS idx_list_leads_list_id ON list_leads(list_id);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_status_updated ON leads(status, updated_at);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_call_history_outcome ON call_history(outcome);
  CREATE INDEX IF NOT EXISTS idx_call_history_date_outcome ON call_history(called_at, outcome);
  CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
  CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
`);

// Migration: add unique index on company name (case-insensitive)
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_company_unique
  ON leads (TRIM(LOWER(company)))
  WHERE company IS NOT NULL AND TRIM(company) != ''
`);

// Backup utility
const backupDir = path.join(dataDir, 'backups');

export function createBackup() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const backupPath = path.join(backupDir, `salestool_${timestamp}.db`);

  db.backup(backupPath);

  // Keep only the last 7 backups
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('salestool_') && f.endsWith('.db'))
    .sort()
    .reverse();

  for (const old of backups.slice(7)) {
    fs.unlinkSync(path.join(backupDir, old));
  }

  return backupPath;
}

export default db;
