import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import db from '../database.js';
import { detectColumnMapping } from '../utils/columnMapping.js';

const router = Router();

// Configure multer for file uploads (temp directory)
const upload = multer({ dest: path.join(process.cwd(), 'data', 'uploads') });

// GET /api/leads/stats - Return counts by status + session stats
router.get('/stats', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT status, COUNT(*) as count FROM leads GROUP BY status
    `).all();

    const total = db.prepare('SELECT COUNT(*) as count FROM leads').get();
    const stats = { total: total.count };
    for (const row of rows) {
      stats[row.status] = row.count;
    }

    // Session stats: calls today and calls per hour
    const callsToday = db.prepare(
      "SELECT COUNT(*) as count FROM call_history WHERE date(called_at) = date('now')"
    ).get();
    stats.calls_today = callsToday.count;

    const firstCallToday = db.prepare(
      "SELECT MIN(called_at) as first_call FROM call_history WHERE date(called_at) = date('now')"
    ).get();

    if (firstCallToday.first_call && callsToday.count > 0) {
      const firstTime = new Date(firstCallToday.first_call + 'Z');
      const now = new Date();
      const hoursElapsed = Math.max(1, (now - firstTime) / (1000 * 60 * 60));
      stats.calls_per_hour = Math.round(callsToday.count / hoursElapsed);
    } else {
      stats.calls_per_hour = 0;
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/next - Smart next lead to call
router.get('/next', (req, res) => {
  try {
    const { list_id } = req.query;

    let listFilter = '';
    const params = {};
    if (list_id) {
      listFilter = 'AND l.id IN (SELECT lead_id FROM list_leads WHERE list_id = @list_id)';
      params.list_id = list_id;
    }

    // Priority: overdue callbacks > new leads > no_answer (oldest first)
    const lead = db.prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM call_history WHERE lead_id = l.id) as call_count,
        (SELECT callback_time FROM call_history WHERE lead_id = l.id AND callback_time IS NOT NULL ORDER BY called_at DESC LIMIT 1) as next_callback
      FROM leads l
      WHERE l.status NOT IN ('not_interested', 'already_customer', 'wrong_number', 'booked_meeting')
      ${listFilter}
      ORDER BY
        CASE
          WHEN l.status = 'callback' AND (SELECT callback_time FROM call_history WHERE lead_id = l.id AND callback_time IS NOT NULL ORDER BY called_at DESC LIMIT 1) <= datetime('now') THEN 0
          WHEN l.status = 'callback' THEN 1
          WHEN l.status = 'new' THEN 2
          WHEN l.status = 'no_answer' THEN 3
          WHEN l.status = 'interested' THEN 4
          ELSE 5
        END,
        l.priority DESC,
        l.updated_at ASC
      LIMIT 1
    `).get(params);

    if (!lead) {
      return res.status(404).json({ error: 'No leads available' });
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/callbacks - Get leads with pending callbacks
router.get('/callbacks', (req, res) => {
  try {
    const callbacks = db.prepare(`
      SELECT l.*,
        ch.callback_time,
        ch.called_at as last_call_date,
        (SELECT COUNT(*) FROM call_history WHERE lead_id = l.id) as call_count
      FROM leads l
      INNER JOIN call_history ch ON ch.id = (
        SELECT id FROM call_history
        WHERE lead_id = l.id AND callback_time IS NOT NULL
        ORDER BY called_at DESC LIMIT 1
      )
      WHERE l.status = 'callback'
      ORDER BY ch.callback_time ASC
    `).all();

    res.json(callbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/analytics - Session analytics
router.get('/analytics', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    // Default: start_date = today, end_date = today
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Calls by hour in date range
    const callsByHour = db.prepare(`
      SELECT strftime('%H', called_at) as hour, COUNT(*) as count
      FROM call_history
      WHERE date(called_at) >= @startDate AND date(called_at) <= @endDate
      GROUP BY hour ORDER BY hour
    `).all({ startDate, endDate });

    // Outcome distribution in date range
    const outcomeDistribution = db.prepare(`
      SELECT outcome, COUNT(*) as count
      FROM call_history
      WHERE date(called_at) >= @startDate AND date(called_at) <= @endDate
      GROUP BY outcome ORDER BY count DESC
    `).all({ startDate, endDate });

    // Average duration by outcome in date range
    const avgDuration = db.prepare(`
      SELECT outcome, ROUND(AVG(duration_seconds)) as avg_seconds, COUNT(*) as count
      FROM call_history
      WHERE duration_seconds IS NOT NULL AND date(called_at) >= @startDate AND date(called_at) <= @endDate
      GROUP BY outcome
    `).all({ startDate, endDate });

    // Conversion funnel (all time)
    const funnel = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM leads) as total,
        (SELECT COUNT(*) FROM leads WHERE status = 'interested') as interested,
        (SELECT COUNT(*) FROM leads WHERE status = 'booked_meeting') as booked_meeting
    `).get();

    // Calls per day in date range
    const callsPerDay = db.prepare(`
      SELECT date(called_at) as day, COUNT(*) as count
      FROM call_history
      WHERE date(called_at) >= @startDate AND date(called_at) <= @endDate
      GROUP BY day ORDER BY day
    `).all({ startDate, endDate });

    res.json({
      calls_by_hour: callsByHour,
      outcome_distribution: outcomeDistribution,
      avg_duration: avgDuration,
      funnel,
      calls_per_day: callsPerDay,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/export - Export leads as CSV
router.get('/export', (req, res) => {
  try {
    const { status, list_id } = req.query;
    let rows;

    if (list_id) {
      const stmt = status
        ? db.prepare(`
            SELECT l.* FROM leads l
            INNER JOIN list_leads ll ON ll.lead_id = l.id
            WHERE ll.list_id = @list_id AND l.status = @status
            ORDER BY ll.sort_order
          `)
        : db.prepare(`
            SELECT l.* FROM leads l
            INNER JOIN list_leads ll ON ll.lead_id = l.id
            WHERE ll.list_id = @list_id
            ORDER BY ll.sort_order
          `);
      rows = stmt.all({ list_id: parseInt(list_id), ...(status ? { status } : {}) });
    } else {
      const stmt = status
        ? db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY company')
        : db.prepare('SELECT * FROM leads ORDER BY company');
      rows = status ? stmt.all(status) : stmt.all();
    }

    // Build CSV
    const columns = ['company', 'contact_name', 'phone', 'email', 'title', 'industry', 'city', 'status'];
    const csvRows = [columns.join(';')];

    for (const row of rows) {
      const values = columns.map((col) => {
        const val = String(row[col] || '').replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(';'));
    }

    const csv = csvRows.join('\n');
    const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM for Excel to detect UTF-8
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads - List all leads with filtering, search, sorting, pagination
router.get('/', (req, res) => {
  try {
    const {
      status,
      search,
      city,
      industry,
      sort_by = 'created_at',
      sort_dir = 'desc',
      page = 1,
      limit = 50,
    } = req.query;

    const conditions = [];
    const params = {};

    if (status) {
      conditions.push('l.status = @status');
      params.status = status;
    }
    if (city) {
      conditions.push('l.city = @city');
      params.city = city;
    }
    if (industry) {
      conditions.push('l.industry = @industry');
      params.industry = industry;
    }
    if (search) {
      conditions.push(
        `(l.company LIKE @search OR l.contact_name LIKE @search OR l.phone LIKE @search OR l.email LIKE @search)`
      );
      params.search = `%${search}%`;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Whitelist sort columns to prevent SQL injection
    const allowedSortColumns = ['id', 'company', 'contact_name', 'phone', 'email', 'title', 'industry', 'city', 'status', 'priority', 'created_at', 'updated_at'];
    const sortCol = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    params.limit = parseInt(limit);
    params.offset = offset;

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM leads l ${whereClause}`).get(params);

    const rows = db.prepare(`
      SELECT l.*, (SELECT COUNT(*) FROM call_history WHERE lead_id = l.id) as call_count
      FROM leads l
      ${whereClause}
      ORDER BY l.${sortCol} ${sortDirection}
      LIMIT @limit OFFSET @offset
    `).all(params);

    res.json({
      leads: rows,
      total: countRow.total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(countRow.total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id - Get single lead with notes count and last call date
router.get('/:id', (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const notesCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE lead_id = ?').get(req.params.id);
    const lastCall = db.prepare('SELECT called_at FROM call_history WHERE lead_id = ? ORDER BY called_at DESC LIMIT 1').get(req.params.id);
    const contacts = db.prepare('SELECT * FROM contacts WHERE lead_id = ? ORDER BY is_primary DESC, created_at ASC').all(req.params.id);

    res.json({
      ...lead,
      contacts,
      notes_count: notesCount.count,
      last_call_date: lastCall ? lastCall.called_at : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads - Create lead
router.post('/', (req, res) => {
  try {
    const { company, contact_name, phone, email, title, industry, city, status, priority, custom_fields } = req.body;

    // Check for duplicate company name
    if (company && company.trim()) {
      const existing = db.prepare(
        'SELECT id FROM leads WHERE TRIM(LOWER(company)) = TRIM(LOWER(?))'
      ).get(company.trim());
      if (existing) {
        return res.status(409).json({ error: `A lead with company "${company}" already exists`, existing_id: existing.id });
      }
    }

    const result = db.prepare(`
      INSERT INTO leads (company, contact_name, phone, email, title, industry, city, status, priority, custom_fields)
      VALUES (@company, @contact_name, @phone, @email, @title, @industry, @city, @status, @priority, @custom_fields)
    `).run({
      company: company || null,
      contact_name: contact_name || null,
      phone: phone || null,
      email: email || null,
      title: title || null,
      industry: industry || null,
      city: city || null,
      status: status || 'new',
      priority: priority || 0,
      custom_fields: custom_fields ? JSON.stringify(custom_fields) : null,
    });

    const leadId = result.lastInsertRowid;

    // Auto-create a primary contact if contact info was provided
    if (contact_name || phone || email || title) {
      db.prepare(`
        INSERT INTO contacts (lead_id, name, title, phone, email, is_primary)
        VALUES (@lead_id, @name, @title, @phone, @email, 1)
      `).run({
        lead_id: leadId,
        name: contact_name || null,
        title: title || null,
        phone: phone || null,
        email: email || null,
      });
    }

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const fields = ['company', 'contact_name', 'phone', 'email', 'title', 'industry', 'city', 'status', 'priority', 'custom_fields'];
    const updates = [];
    const params = { id: req.params.id };

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if (field === 'custom_fields' && typeof value === 'object') {
          value = JSON.stringify(value);
        }
        updates.push(`${field} = @${field}`);
        params[field] = value;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = @id`).run(params);

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/import - Upload and import Excel file
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (rawData.length === 0) {
      return res.json({ imported: 0, message: 'No data found in file' });
    }

    const headers = Object.keys(rawData[0]);
    const { mapping, customHeaders } = detectColumnMapping(headers);

    const insertStmt = db.prepare(`
      INSERT INTO leads (company, contact_name, phone, email, title, industry, city, custom_fields)
      VALUES (@company, @contact_name, @phone, @email, @title, @industry, @city, @custom_fields)
    `);

    const checkDuplicate = db.prepare(
      'SELECT id, company FROM leads WHERE TRIM(LOWER(company)) = TRIM(LOWER(?))'
    );

    const insertMany = db.transaction((rows) => {
      let count = 0;
      const skipped = [];
      for (const row of rows) {
        // Skip empty rows - check if all mapped values are empty
        const allEmpty = headers.every(h => {
          const val = String(row[h] || '').trim();
          return val === '';
        });
        if (allEmpty) continue;

        const lead = {
          company: null,
          contact_name: null,
          phone: null,
          email: null,
          title: null,
          industry: null,
          city: null,
          custom_fields: null,
        };

        // Map known columns
        for (const [header, dbField] of Object.entries(mapping)) {
          const value = String(row[header] || '').trim();
          if (value) {
            lead[dbField] = value;
          }
        }

        // Collect custom fields
        if (customHeaders.length > 0) {
          const custom = {};
          for (const header of customHeaders) {
            const value = String(row[header] || '').trim();
            if (value) {
              custom[header] = value;
            }
          }
          if (Object.keys(custom).length > 0) {
            lead.custom_fields = JSON.stringify(custom);
          }
        }

        // Skip duplicates
        if (lead.company && lead.company.trim()) {
          const existing = checkDuplicate.get(lead.company.trim());
          if (existing) {
            skipped.push(lead.company);
            continue;
          }
        }

        insertStmt.run(lead);
        count++;
      }
      return { count, skipped };
    });

    const { count: imported, skipped } = insertMany(rawData);
    const message = skipped.length > 0
      ? `Imported ${imported} leads. Skipped ${skipped.length} duplicates: ${skipped.join(', ')}`
      : `Successfully imported ${imported} leads`;
    res.json({ imported, skipped: skipped.length, skipped_companies: skipped, message });
  } catch (err) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
