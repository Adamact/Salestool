import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'salestool.db');
const TSV_FILES = [
  path.join(__dirname, 'data', 'leads.tsv'),
  path.join(__dirname, 'data', 'leads2.tsv'),
];

function getPriority(tier) {
  if (!tier) return 0;
  const t = tier.toLowerCase();
  if (t.includes('1') || t.includes('lokal toppkandidat') || t.includes('innovationsledare')) return 3;
  if (t.includes('2') || t.includes('nationell toppkandidat')) return 2;
  if (t.includes('3') || t.includes('regional expansion') || t.includes('stor aktör')) return 1;
  return 0;
}

function parseTsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  if (lines.length === 0) return [];

  // Skip header line
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split('\t').map((f) => f.trim());
    const [Company, Industry, City, Employees, Contact, Title, Email, LinkedIn, Website, Tier, WhyGoodFit, Status, Notes] = fields;

    if (!Company) continue;

    rows.push({ Company, Industry, City, Employees, Contact, Title, Email, LinkedIn, Website, Tier, WhyGoodFit, Status, Notes });
  }

  return rows;
}

function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const insertLead = db.prepare(`
    INSERT INTO leads (company, contact_name, email, title, industry, city, status, priority, custom_fields)
    VALUES (@company, @contact_name, @email, @title, @industry, @city, @status, @priority, @custom_fields)
  `);

  const insertNote = db.prepare(`
    INSERT INTO notes (lead_id, text)
    VALUES (@lead_id, @text)
  `);

  let totalInserted = 0;

  for (const tsvFile of TSV_FILES) {
    const basename = path.basename(tsvFile);

    if (!fs.existsSync(tsvFile)) {
      console.warn(`Warning: ${basename} not found, skipping.`);
      continue;
    }

    console.log(`Reading ${basename}...`);
    const rows = parseTsv(tsvFile);
    console.log(`  Parsed ${rows.length} rows from ${basename}`);

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const customFields = JSON.stringify({
          employees: row.Employees || '',
          linkedin: row.LinkedIn || '',
          website: row.Website || '',
          tier: row.Tier || '',
          whyGoodFit: row.WhyGoodFit || '',
        });

        const result = insertLead.run({
          company: row.Company,
          contact_name: row.Contact || '',
          email: row.Email || '',
          title: row.Title || '',
          industry: row.Industry || '',
          city: row.City || '',
          status: 'new',
          priority: getPriority(row.Tier),
          custom_fields: customFields,
        });

        const leadId = result.lastInsertRowid;

        if (row.Notes && row.Notes.trim()) {
          insertNote.run({ lead_id: leadId, text: row.Notes.trim() });
        }

        totalInserted++;
        if (totalInserted % 50 === 0) {
          console.log(`  Progress: ${totalInserted} leads inserted...`);
        }
      }
    });

    insertMany(rows);
    console.log(`  Done with ${basename}.`);
  }

  console.log(`\nImport complete. Total leads inserted: ${totalInserted}`);
  db.close();
}

main();
