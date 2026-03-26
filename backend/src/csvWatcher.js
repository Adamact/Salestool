import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import db from './database.js';

const INBOX_DIR = path.join(process.cwd(), 'data', 'inbox');
const PROCESSED_DIR = path.join(process.cwd(), 'data', 'inbox', 'processed');

// Column name mapping - same as in leads.js
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

function importCSV(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawData.length === 0) {
    console.log(`[CSV Watcher] Empty file: ${filePath}`);
    return { imported: 0, skipped: 0 };
  }

  const headers = Object.keys(rawData[0]);
  const { mapping, customHeaders } = detectColumnMapping(headers);

  // Create a list for this import
  const listName = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const listResult = db.prepare(
    'INSERT INTO lists (name, description) VALUES (?, ?)'
  ).run(listName, `Auto-imported from ${path.basename(filePath)} on ${new Date().toISOString().split('T')[0]}`);
  const listId = listResult.lastInsertRowid;

  const insertStmt = db.prepare(`
    INSERT INTO leads (company, contact_name, phone, email, title, industry, city, custom_fields)
    VALUES (@company, @contact_name, @phone, @email, @title, @industry, @city, @custom_fields)
  `);
  const checkDuplicate = db.prepare(
    'SELECT id FROM leads WHERE TRIM(LOWER(company)) = TRIM(LOWER(?))'
  );
  const insertListLead = db.prepare(
    'INSERT OR IGNORE INTO list_leads (list_id, lead_id, sort_order) VALUES (?, ?, ?)'
  );

  const insertContact = db.prepare(`
    INSERT INTO contacts (lead_id, name, title, phone, phone_mobile, email, linkedin, is_primary)
    VALUES (@lead_id, @name, @title, @phone, @phone_mobile, @email, @linkedin, 1)
  `);

  const result = db.transaction(() => {
    let imported = 0;
    let skipped = 0;

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

      if (customHeaders.length > 0) {
        const custom = {};
        for (const header of customHeaders) {
          const value = String(row[header] || '').trim();
          if (value) custom[header] = value;
        }
        if (Object.keys(custom).length > 0) {
          lead.custom_fields = JSON.stringify(custom);
        }
      }

      // Skip duplicates
      if (lead.company && lead.company.trim()) {
        const existing = checkDuplicate.get(lead.company.trim());
        if (existing) {
          // Still add existing lead to the new list
          insertListLead.run(listId, existing.id, imported + skipped);
          skipped++;
          continue;
        }
      }

      const res = insertStmt.run(lead);
      const leadId = res.lastInsertRowid;
      insertListLead.run(listId, leadId, imported + skipped);

      // Create kontaktkort (contact card) if contact info exists
      const contactName = lead.contact_name;
      const contactTitle = lead.title;
      const contactPhone = lead.phone;
      const contactEmail = lead.email;
      let contactLinkedin = null;

      // Check custom_fields for linkedin
      if (lead.custom_fields) {
        try {
          const custom = JSON.parse(lead.custom_fields);
          contactLinkedin = custom.linkedin || null;
        } catch {}
      }

      if (contactName || contactPhone || contactEmail) {
        // Detect mobile vs landline (Swedish mobile: 07x)
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
      }

      imported++;
    }

    // If nothing was imported and nothing was added to the list, remove the empty list
    if (imported === 0 && skipped === 0) {
      db.prepare('DELETE FROM lists WHERE id = ?').run(listId);
    }

    return { imported, skipped, listName };
  })();

  return result;
}

function moveToProcessed(filePath) {
  const dest = path.join(PROCESSED_DIR, path.basename(filePath));
  // If file already exists in processed, add timestamp
  const finalDest = fs.existsSync(dest)
    ? path.join(PROCESSED_DIR, `${Date.now()}_${path.basename(filePath)}`)
    : dest;
  fs.renameSync(filePath, finalDest);
}

export function startCSVWatcher() {
  // Ensure directories exist
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });

  // Process any existing files on startup
  processExistingFiles();

  // Watch for new files
  fs.watch(INBOX_DIR, (eventType, filename) => {
    if (!filename) return;
    if (!filename.match(/\.(csv|xlsx|xls)$/i)) return;
    if (filename.startsWith('.')) return;

    const filePath = path.join(INBOX_DIR, filename);

    // Debounce: wait for file to finish writing
    setTimeout(() => {
      if (!fs.existsSync(filePath)) return;
      try {
        processFile(filePath);
      } catch (err) {
        console.error(`[CSV Watcher] Error processing ${filename}:`, err.message);
      }
    }, 1000);
  });

  console.log(`[CSV Watcher] Watching ${INBOX_DIR} for new CSV/Excel files`);
}

function processExistingFiles() {
  if (!fs.existsSync(INBOX_DIR)) return;
  const files = fs.readdirSync(INBOX_DIR).filter(f => f.match(/\.(csv|xlsx|xls)$/i));
  for (const file of files) {
    try {
      processFile(path.join(INBOX_DIR, file));
    } catch (err) {
      console.error(`[CSV Watcher] Error processing ${file}:`, err.message);
    }
  }
}

function processFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`[CSV Watcher] Processing ${filename}...`);

  const { imported, skipped, listName } = importCSV(filePath);
  moveToProcessed(filePath);

  console.log(`[CSV Watcher] Done: ${imported} imported, ${skipped} duplicates added to list "${listName}"`);
}
