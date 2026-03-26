import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Create tables if they don't exist
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

// GET /api/lists - Get all lists with lead count
router.get('/', (req, res) => {
  try {
    const lists = db.prepare(`
      SELECT l.*, (SELECT COUNT(*) FROM list_leads ll WHERE ll.list_id = l.id) as lead_count
      FROM lists l
      ORDER BY l.created_at DESC
    `).all();

    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lists - Create a new list
router.post('/', (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const result = db.prepare(
      'INSERT INTO lists (name, description, color) VALUES (?, ?, ?)'
    ).run(name.trim(), description || null, color || '#3b82f6');

    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/lists/:id - Update list name/description/color
router.put('/:id', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const { name, description, color } = req.body;
    const updatedName = name !== undefined ? name.trim() : list.name;
    const updatedDescription = description !== undefined ? description : list.description;
    const updatedColor = color !== undefined ? color : list.color;

    if (!updatedName) {
      return res.status(400).json({ error: 'List name cannot be empty' });
    }

    db.prepare(
      'UPDATE lists SET name = ?, description = ?, color = ? WHERE id = ?'
    ).run(updatedName, updatedDescription, updatedColor, req.params.id);

    const updated = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/lists/:id - Delete a list (cascade deletes list_leads)
router.delete('/:id', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    db.prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
    res.json({ message: 'List deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lists/:id/leads - Get all leads in a list, ordered by sort_order
router.get('/:id/leads', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const leads = db.prepare(`
      SELECT leads.*, ll.sort_order, ll.added_at as list_added_at
      FROM list_leads ll
      JOIN leads ON leads.id = ll.lead_id
      WHERE ll.list_id = ?
      ORDER BY ll.sort_order ASC
    `).all(req.params.id);

    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lists/:id/leads - Add one or more leads to the list
router.post('/:id/leads', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const { lead_ids } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids must be a non-empty array' });
    }

    // Get the current max sort_order for this list
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM list_leads WHERE list_id = ?'
    ).get(req.params.id);

    let nextOrder = maxOrder.max_order + 1;
    let added = 0;

    const insert = db.prepare(
      'INSERT OR IGNORE INTO list_leads (list_id, lead_id, sort_order) VALUES (?, ?, ?)'
    );

    const addLeads = db.transaction(() => {
      for (const leadId of lead_ids) {
        const result = insert.run(req.params.id, leadId, nextOrder);
        if (result.changes > 0) {
          added++;
          nextOrder++;
        }
      }
    });

    addLeads();
    res.json({ added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/lists/:id/leads/:leadId - Remove a lead from the list
router.delete('/:id/leads/:leadId', (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM list_leads WHERE list_id = ? AND lead_id = ?'
    ).run(req.params.id, req.params.leadId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lead not found in this list' });
    }

    res.json({ message: 'Lead removed from list' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/lists/:id/leads/reorder - Reorder leads in the list
router.put('/:id/leads/reorder', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const { lead_ids } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids must be a non-empty array' });
    }

    const update = db.prepare(
      'UPDATE list_leads SET sort_order = ? WHERE list_id = ? AND lead_id = ?'
    );

    const reorder = db.transaction(() => {
      for (let i = 0; i < lead_ids.length; i++) {
        update.run(i, req.params.id, lead_ids[i]);
      }
    });

    reorder();
    res.json({ message: 'Leads reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lists/for-lead/:leadId - Get all lists that contain a specific lead
router.get('/for-lead/:leadId', (req, res) => {
  try {
    const lists = db.prepare(`
      SELECT l.*, ll.sort_order, ll.added_at as list_added_at
      FROM lists l
      JOIN list_leads ll ON ll.list_id = l.id
      WHERE ll.lead_id = ?
      ORDER BY l.created_at DESC
    `).all(req.params.leadId);

    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
