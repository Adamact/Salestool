import { Router } from 'express';
import db from '../database.js';
import { validateId } from '../middleware/validateId.js';

const router = Router();

// GET /api/leads/:id/contacts - Get all contacts for a lead
router.get('/:id/contacts', validateId('id'), (req, res) => {
  try {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const contacts = db.prepare(
      'SELECT * FROM contacts WHERE lead_id = ? ORDER BY is_primary DESC, created_at ASC'
    ).all(req.params.id);

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/contacts - Add contact to lead
router.post('/:id/contacts', validateId('id'), (req, res) => {
  try {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { name, title, phone, phone_mobile, email, department, linkedin, is_primary } = req.body;

    const createContact = db.transaction(() => {
      // If marking as primary, unset other primaries first
      if (is_primary) {
        db.prepare('UPDATE contacts SET is_primary = 0 WHERE lead_id = ?').run(req.params.id);
      }

      // If this is the first contact, make it primary
      const count = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE lead_id = ?').get(req.params.id);
      const makePrimary = is_primary || count.count === 0 ? 1 : 0;

      const result = db.prepare(`
        INSERT INTO contacts (lead_id, name, title, phone, phone_mobile, email, department, linkedin, is_primary)
        VALUES (@lead_id, @name, @title, @phone, @phone_mobile, @email, @department, @linkedin, @is_primary)
      `).run({
        lead_id: req.params.id,
        name: name || null,
        title: title || null,
        phone: phone || null,
        phone_mobile: phone_mobile || null,
        email: email || null,
        department: department || null,
        linkedin: linkedin || null,
        is_primary: makePrimary,
      });

      return result.lastInsertRowid;
    });

    const contactId = createContact();
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:leadId/contacts/:contactId - Update contact
router.put('/:leadId/contacts/:contactId', validateId('leadId', 'contactId'), (req, res) => {
  try {
    const contact = db.prepare(
      'SELECT * FROM contacts WHERE id = ? AND lead_id = ?'
    ).get(req.params.contactId, req.params.leadId);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const fields = ['name', 'title', 'phone', 'phone_mobile', 'email', 'department', 'linkedin', 'is_primary'];
    const updates = [];
    const params = { id: req.params.contactId };

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);
        params[field] = req.body[field];
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // If setting as primary, unset others first
    if (req.body.is_primary) {
      db.prepare('UPDATE contacts SET is_primary = 0 WHERE lead_id = ?').run(req.params.leadId);
    }

    db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = @id`).run(params);

    const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.contactId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:leadId/contacts/:contactId - Delete contact
router.delete('/:leadId/contacts/:contactId', validateId('leadId', 'contactId'), (req, res) => {
  try {
    const contact = db.prepare(
      'SELECT * FROM contacts WHERE id = ? AND lead_id = ?'
    ).get(req.params.contactId, req.params.leadId);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const deleteContact = db.transaction(() => {
      db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.contactId);

      // If deleted contact was primary, promote the next one
      if (contact.is_primary) {
        const next = db.prepare(
          'SELECT id FROM contacts WHERE lead_id = ? ORDER BY created_at ASC LIMIT 1'
        ).get(req.params.leadId);
        if (next) {
          db.prepare('UPDATE contacts SET is_primary = 1 WHERE id = ?').run(next.id);
        }
      }
    });

    deleteContact();
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
