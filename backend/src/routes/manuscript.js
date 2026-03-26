import { Router } from 'express';
import db from '../database.js';

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

// Seed function (also used on startup)
export function seedManuscript() {
  const count = db.prepare('SELECT COUNT(*) as count FROM manuscript').get();
  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO manuscript (section_type, title, content, sort_order)
      VALUES (@section_type, @title, @content, @sort_order)
    `);
    const insertAll = db.transaction((sections) => {
      for (const section of sections) {
        insert.run(section);
      }
    });
    insertAll(DEFAULT_SEED_DATA);
    return true;
  }
  return false;
}

// GET /api/manuscript - Get all sections ordered by sort_order
router.get('/', (req, res) => {
  try {
    const sections = db.prepare(
      'SELECT * FROM manuscript ORDER BY sort_order ASC, id ASC'
    ).all();
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manuscript - Create section
router.post('/', (req, res) => {
  try {
    const { section_type, title, content, sort_order } = req.body;

    if (!section_type || !title || !content) {
      return res.status(400).json({ error: 'section_type, title, and content are required' });
    }

    const result = db.prepare(`
      INSERT INTO manuscript (section_type, title, content, sort_order)
      VALUES (@section_type, @title, @content, @sort_order)
    `).run({
      section_type,
      title,
      content,
      sort_order: sort_order || 0,
    });

    const section = db.prepare('SELECT * FROM manuscript WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/manuscript/:id - Update section
router.put('/:id', (req, res) => {
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
router.delete('/:id', (req, res) => {
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

// POST /api/manuscript/seed - Seed with default data
router.post('/seed', (req, res) => {
  try {
    // Clear existing and re-seed
    db.prepare('DELETE FROM manuscript').run();
    const insert = db.prepare(`
      INSERT INTO manuscript (section_type, title, content, sort_order)
      VALUES (@section_type, @title, @content, @sort_order)
    `);
    const insertAll = db.transaction((sections) => {
      for (const section of sections) {
        insert.run(section);
      }
    });
    insertAll(DEFAULT_SEED_DATA);

    const sections = db.prepare('SELECT * FROM manuscript ORDER BY sort_order ASC').all();
    res.json({ message: 'Manuscript seeded with default data', sections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
