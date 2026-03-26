import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Outcome-to-status mapping for auto-updating lead status
const OUTCOME_STATUS_MAP = {
  no_answer: 'no_answer',
  callback: 'callback',
  interested: 'interested',
  not_interested: 'not_interested',
  booked_meeting: 'booked_meeting',
  already_customer: 'already_customer',
  wrong_number: 'wrong_number',
};

const VALID_OUTCOMES = Object.keys(OUTCOME_STATUS_MAP);

// GET /api/leads/:id/notes - Get all notes for a lead (newest first)
router.get('/:id/notes', (req, res) => {
  try {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const notes = db.prepare(
      'SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC'
    ).all(req.params.id);

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/notes - Add note to lead
router.post('/:id/notes', (req, res) => {
  try {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    const result = db.prepare(
      'INSERT INTO notes (lead_id, text) VALUES (?, ?)'
    ).run(req.params.id, text.trim());

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id/history - Get call history for a lead
router.get('/:id/history', (req, res) => {
  try {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const history = db.prepare(
      'SELECT * FROM call_history WHERE lead_id = ? ORDER BY called_at DESC'
    ).all(req.params.id);

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/history - Log a call
router.post('/:id/history', (req, res) => {
  try {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { outcome, notes, callback_time, duration_seconds } = req.body;
    if (!outcome) {
      return res.status(400).json({ error: 'Outcome is required' });
    }
    if (!VALID_OUTCOMES.includes(outcome) && !['sent_email', 'sent_followup'].includes(outcome)) {
      return res.status(400).json({
        error: `Invalid outcome. Valid outcomes: ${VALID_OUTCOMES.join(', ')}, sent_email, sent_followup`,
      });
    }

    const logCall = db.transaction(() => {
      // Insert call history record
      const result = db.prepare(
        'INSERT INTO call_history (lead_id, outcome, notes, callback_time, duration_seconds) VALUES (?, ?, ?, ?, ?)'
      ).run(req.params.id, outcome, notes || null, callback_time || null, duration_seconds || null);

      // Auto-update lead status to match outcome (skip for sent_email/sent_followup to preserve current status)
      const newStatus = OUTCOME_STATUS_MAP[outcome];
      if (newStatus) {
        db.prepare(
          'UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(newStatus, req.params.id);
      }

      return result.lastInsertRowid;
    });

    const callId = logCall();
    const call = db.prepare('SELECT * FROM call_history WHERE id = ?').get(callId);
    res.status(201).json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
