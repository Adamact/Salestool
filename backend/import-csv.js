import Database from 'better-sqlite3';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFile = process.argv[2] || path.join(__dirname, 'data', 'inbox', 'processed', 'test-import.csv');
const dbPath = path.join(__dirname, 'data', 'salestool.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const COLUMN_MAP = {
  company: ['company', 'företag', 'foretag', 'firma', 'bolag', 'name'],
  contact_name: ['contact_name', 'contact_person', 'kontakt', 'kontaktperson', 'contact'],
  phone: ['phone', 'telefon', 'tel', 'telefonnummer', 'mobilnummer', 'mobil'],
  email: ['email', 'e-post', 'epost', 'e-mail', 'mail'],
  title: ['title', 'titel', 'befattning', 'roll', 'role', 'position', 'contact_title'],
  industry: ['industry', 'bransch', 'sektor', 'sector', 'sni_code'],
  city: ['city', 'stad', 'ort', 'postort', 'kommun', 'location'],
};

function detectColumnMapping(headers) {
  const mapping = {};
  const mappedHeaders = new Set();
  for (const [dbField, aliases] of Object.entries(COLUMN_MAP)) {
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      if (aliases.includes(normalized)) {
        mapping[header] = dbField;
        mappedHeaders.add(header);
        break;
      }
    }
  }
  const customHeaders = headers.filter(h => !mappedHeaders.has(h));
  return { mapping, customHeaders };
}

console.log(`Reading CSV: ${csvFile}`);
console.log(`Database: ${dbPath}`);

const workbook = XLSX.readFile(csvFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log(`Found ${rawData.length} rows`);

const headers = Object.keys(rawData[0]);
const { mapping, customHeaders } = detectColumnMapping(headers);

console.log('Column mapping:', mapping);
console.log('Custom fields:', customHeaders);

const listName = path.basename(csvFile, path.extname(csvFile)).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const checkDuplicate = db.prepare('SELECT id FROM leads WHERE TRIM(LOWER(company)) = TRIM(LOWER(?))');
const insertLead = db.prepare(`
  INSERT INTO leads (company, contact_name, phone, email, title, industry, city, custom_fields)
  VALUES (@company, @contact_name, @phone, @email, @title, @industry, @city, @custom_fields)
`);
const insertContact = db.prepare(`
  INSERT INTO contacts (lead_id, name, title, phone, phone_mobile, email, linkedin, is_primary)
  VALUES (@lead_id, @name, @title, @phone, @phone_mobile, @email, @linkedin, 1)
`);
const checkContactExists = db.prepare('SELECT id FROM contacts WHERE lead_id = ? AND is_primary = 1');

// Create list
const listResult = db.prepare('INSERT INTO lists (name, description) VALUES (?, ?)').run(
  listName,
  `Imported from ${path.basename(csvFile)} on ${new Date().toISOString().split('T')[0]}`
);
const listId = listResult.lastInsertRowid;
const insertListLead = db.prepare('INSERT OR IGNORE INTO list_leads (list_id, lead_id, sort_order) VALUES (?, ?, ?)');

const result = db.transaction(() => {
  let imported = 0;
  let skipped = 0;
  let contactsCreated = 0;

  for (const row of rawData) {
    const allEmpty = headers.every(h => String(row[h] || '').trim() === '');
    if (allEmpty) continue;

    const lead = {
      company: null, contact_name: null, phone: null, email: null,
      title: null, industry: null, city: null, custom_fields: null,
    };

    for (const [header, dbField] of Object.entries(mapping)) {
      const value = String(row[header] || '').trim();
      if (value) lead[dbField] = value;
    }

    // Collect custom fields
    const custom = {};
    for (const header of customHeaders) {
      const value = String(row[header] || '').trim();
      if (value) custom[header] = value;
    }
    if (Object.keys(custom).length > 0) {
      lead.custom_fields = JSON.stringify(custom);
    }

    let leadId;
    if (lead.company && lead.company.trim()) {
      const existing = checkDuplicate.get(lead.company.trim());
      if (existing) {
        leadId = existing.id;
        insertListLead.run(listId, leadId, imported + skipped);
        skipped++;
      } else {
        const res = insertLead.run(lead);
        leadId = res.lastInsertRowid;
        insertListLead.run(listId, leadId, imported + skipped);
        imported++;
      }
    } else {
      continue;
    }

    // Create kontaktkort if contact info exists and no primary contact yet
    const existingContact = checkContactExists.get(leadId);
    if (!existingContact) {
      const contactName = lead.contact_name;
      const contactTitle = lead.title;
      const contactPhone = lead.phone;
      const contactEmail = lead.email;
      const contactLinkedin = custom.linkedin || null;

      if (contactName || contactPhone || contactEmail) {
        let phone = contactPhone;
        let phoneMobile = null;
        if (contactPhone && /^(\+?46\s*7|07)/.test(contactPhone.replace(/[-()\s]/g, ''))) {
          phoneMobile = contactPhone;
          phone = null;
        }

        insertContact.run({
          lead_id: leadId,
          name: contactName,
          title: contactTitle,
          phone: phone,
          phone_mobile: phoneMobile,
          email: contactEmail,
          linkedin: contactLinkedin,
        });
        contactsCreated++;
      }
    }
  }

  if (imported === 0 && skipped === 0) {
    db.prepare('DELETE FROM lists WHERE id = ?').run(listId);
  }

  return { imported, skipped, contactsCreated };
})();

console.log(`\nDone!`);
console.log(`  Leads imported: ${result.imported}`);
console.log(`  Duplicates (added to list): ${result.skipped}`);
console.log(`  Kontaktkort created: ${result.contactsCreated}`);
console.log(`  List: "${listName}"`);

db.close();
