import { Router } from 'express';
import db from '../database.js';
import { validateId } from '../middleware/validateId.js';

const router = Router();

const DEFAULT_SEED_DATA = [
  {
    section_type: 'opening',
    title: 'Öppningsfras',
    content: 'Hej [Namn], mitt namn är [Ditt namn] och jag ringer från [Företag]. Har jag kommit rätt till dig som ansvarar för [område]? Anledningen till att jag ringer är...',
    sort_order: 1,
  },
  {
    section_type: 'objection',
    title: 'Vi är inte intresserade',
    content: 'Jag förstår att det kan kännas så, speciellt när man inte vet exakt vad det handlar om. Kan jag få 30 sekunder att förklara varför jag ringer, sen kan du avgöra om det är relevant?',
    sort_order: 2,
  },
  {
    section_type: 'objection',
    title: 'Vi har redan en leverantör',
    content: 'Bra att höra att ni redan jobbar med det här området! Många av våra bästa kunder hade en befintlig leverantör innan. Vad jag brukar höra är att det alltid är värt att jämföra...',
    sort_order: 3,
  },
  {
    section_type: 'objection',
    title: 'Skicka ett mail istället',
    content: 'Det kan jag absolut göra! Men för att skicka rätt information - kan jag ställa två snabba frågor först?',
    sort_order: 4,
  },
  {
    section_type: 'objection',
    title: 'Jag har inte tid just nu',
    content: 'Jag förstår, du har säkert fullt upp. Kan vi boka in 10 minuter [dag]? Då kan du avgöra om det är värt att gå vidare.',
    sort_order: 5,
  },
  {
    section_type: 'objection',
    title: 'Det är för dyrt',
    content: 'Jag hör dig. Priset är såklart viktigt. Vad vi brukar se är att kostnaden betalar sig genom [värde]. Kan vi titta på det tillsammans?',
    sort_order: 6,
  },
];

function getActiveGroupId() {
  const row = db.prepare('SELECT id FROM manuscripts WHERE is_active = 1').get();
  return row ? row.id : null;
}

// Seed function (also used on startup)
export function seedManuscript() {
  const count = db.prepare('SELECT COUNT(*) as count FROM manuscript').get();
  if (count.count === 0) {
    let groupId = getActiveGroupId();
    if (!groupId) {
      const info = db.prepare('INSERT INTO manuscripts (name, is_active) VALUES (?, 1)').run('Standard');
      groupId = info.lastInsertRowid;
    }
    const insert = db.prepare(`
      INSERT INTO manuscript (section_type, title, content, sort_order, manuscript_id)
      VALUES (@section_type, @title, @content, @sort_order, @manuscript_id)
    `);
    const insertAll = db.transaction((sections) => {
      for (const section of sections) {
        insert.run({ ...section, manuscript_id: groupId });
      }
    });
    insertAll(DEFAULT_SEED_DATA);
    return true;
  }
  return false;
}

// ── Manuscript Group endpoints ──

// GET /api/manuscript/groups - List all manuscript groups
router.get('/groups', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM manuscripts ORDER BY created_at ASC').all();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manuscript/groups - Create a new group
router.post('/groups', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = db.prepare('INSERT INTO manuscripts (name, is_active) VALUES (?, 0)').run(name.trim());
    const group = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/manuscript/groups/:id - Rename a group
router.put('/groups/:id', validateId('id'), (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const existing = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Manuscript group not found' });
    }
    db.prepare('UPDATE manuscripts SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    const group = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(req.params.id);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/manuscript/groups/:id - Delete a group (cascade deletes sections)
router.delete('/groups/:id', validateId('id'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Manuscript group not found' });
    }
    const total = db.prepare('SELECT COUNT(*) as count FROM manuscripts').get();
    if (total.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last manuscript group' });
    }

    const wasActive = existing.is_active;
    db.prepare('DELETE FROM manuscript WHERE manuscript_id = ?').run(req.params.id);
    db.prepare('DELETE FROM manuscripts WHERE id = ?').run(req.params.id);

    // If we deleted the active group, activate another one
    if (wasActive) {
      const next = db.prepare('SELECT id FROM manuscripts ORDER BY created_at ASC LIMIT 1').get();
      if (next) {
        db.prepare('UPDATE manuscripts SET is_active = 1 WHERE id = ?').run(next.id);
      }
    }

    res.json({ message: 'Manuscript group deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manuscript/groups/:id/duplicate - Duplicate a group and its sections
router.post('/groups/:id/duplicate', validateId('id'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Manuscript group not found' });
    }

    const newName = `${existing.name} (kopia)`;
    const result = db.prepare('INSERT INTO manuscripts (name, is_active) VALUES (?, 0)').run(newName);
    const newGroupId = result.lastInsertRowid;

    const sections = db.prepare('SELECT * FROM manuscript WHERE manuscript_id = ?').all(req.params.id);
    const insert = db.prepare(`
      INSERT INTO manuscript (section_type, title, content, sort_order, manuscript_id)
      VALUES (@section_type, @title, @content, @sort_order, @manuscript_id)
    `);
    const copyAll = db.transaction(() => {
      for (const section of sections) {
        insert.run({
          section_type: section.section_type,
          title: section.title,
          content: section.content,
          sort_order: section.sort_order,
          manuscript_id: newGroupId,
        });
      }
    });
    copyAll();

    const group = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(newGroupId);
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/manuscript/groups/:id/activate - Set as active group
router.put('/groups/:id/activate', validateId('id'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Manuscript group not found' });
    }
    db.prepare('UPDATE manuscripts SET is_active = 0').run();
    db.prepare('UPDATE manuscripts SET is_active = 1 WHERE id = ?').run(req.params.id);
    const group = db.prepare('SELECT * FROM manuscripts WHERE id = ?').get(req.params.id);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Section endpoints ──

// GET /api/manuscript - Get sections for a group (default: active group)
router.get('/', (req, res) => {
  try {
    const groupId = req.query.group || getActiveGroupId();
    if (!groupId) {
      return res.json([]);
    }
    const sections = db.prepare(
      'SELECT * FROM manuscript WHERE manuscript_id = ? ORDER BY sort_order ASC, id ASC'
    ).all(groupId);
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manuscript - Create section
router.post('/', (req, res) => {
  try {
    const { section_type, title, content, sort_order, manuscript_id } = req.body;

    if (!section_type || !title || !content) {
      return res.status(400).json({ error: 'section_type, title, and content are required' });
    }

    const groupId = manuscript_id || getActiveGroupId();

    const result = db.prepare(`
      INSERT INTO manuscript (section_type, title, content, sort_order, manuscript_id)
      VALUES (@section_type, @title, @content, @sort_order, @manuscript_id)
    `).run({
      section_type,
      title,
      content,
      sort_order: sort_order || 0,
      manuscript_id: groupId,
    });

    const section = db.prepare('SELECT * FROM manuscript WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/manuscript/:id - Update section
router.put('/:id', validateId('id'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM manuscript WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Manuscript section not found' });
    }

    const fields = ['section_type', 'title', 'content', 'sort_order'];
    const updates = [];
    const params = { id: req.params.id };

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);
        params[field] = req.body[field];
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    db.prepare(`UPDATE manuscript SET ${updates.join(', ')} WHERE id = @id`).run(params);

    const section = db.prepare('SELECT * FROM manuscript WHERE id = ?').get(req.params.id);
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/manuscript/:id - Delete section
router.delete('/:id', validateId('id'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM manuscript WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Manuscript section not found' });
    }

    db.prepare('DELETE FROM manuscript WHERE id = ?').run(req.params.id);
    res.json({ message: 'Manuscript section deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manuscript/seed - Seed active group with default data
router.post('/seed', (req, res) => {
  try {
    let groupId = getActiveGroupId();
    if (!groupId) {
      const info = db.prepare('INSERT INTO manuscripts (name, is_active) VALUES (?, 1)').run('Standard');
      groupId = info.lastInsertRowid;
    }

    db.prepare('DELETE FROM manuscript WHERE manuscript_id = ?').run(groupId);
    const insert = db.prepare(`
      INSERT INTO manuscript (section_type, title, content, sort_order, manuscript_id)
      VALUES (@section_type, @title, @content, @sort_order, @manuscript_id)
    `);
    const insertAll = db.transaction((sections) => {
      for (const section of sections) {
        insert.run({ ...section, manuscript_id: groupId });
      }
    });
    insertAll(DEFAULT_SEED_DATA);

    const sections = db.prepare('SELECT * FROM manuscript WHERE manuscript_id = ? ORDER BY sort_order ASC').all(groupId);
    res.json({ message: 'Manuscript seeded with default data', sections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
