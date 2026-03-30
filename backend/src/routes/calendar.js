import { Router } from 'express';
import crypto from 'crypto';
import db from '../database.js';
import { validateId } from '../middleware/validateId.js';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ---------------------------------------------------------------------------
// Database tables
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'other',
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    google_event_id TEXT,
    google_calendar_id TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_events_lead_id ON events(lead_id);
  CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
  CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON events(google_event_id);

  CREATE TABLE IF NOT EXISTS google_auth (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT,
    refresh_token TEXT,
    expiry_date INTEGER,
    calendar_id TEXT DEFAULT 'primary'
  );
`);

// ---------------------------------------------------------------------------
// Google OAuth setup
// ---------------------------------------------------------------------------
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const credentialsPath = path.join(__dirname, '..', '..', 'data', 'google-credentials.json');

let oauth2Client = null;
const pendingOAuthStates = new Map();

function loadCredentials() {
  try {
    if (fs.existsSync(credentialsPath)) {
      const raw = fs.readFileSync(credentialsPath, 'utf-8');
      const creds = JSON.parse(raw);
      const { client_id, client_secret, redirect_uri } = creds;
      if (client_id && client_secret) {
        oauth2Client = new google.auth.OAuth2(
          client_id,
          client_secret,
          redirect_uri || 'http://localhost:3001/api/calendar/google/callback'
        );
        return true;
      }
    }
  } catch (err) {
    console.error('Failed to load Google credentials:', err.message);
  }
  return false;
}

loadCredentials();

function getStoredTokens() {
  const row = db.prepare('SELECT access_token, refresh_token, expiry_date, calendar_id FROM google_auth WHERE id = 1').get();
  return row || null;
}

function saveTokens(tokens) {
  const existing = getStoredTokens();
  if (existing) {
    db.prepare(`
      UPDATE google_auth
      SET access_token = @access_token,
          refresh_token = COALESCE(@refresh_token, refresh_token),
          expiry_date = @expiry_date
      WHERE id = 1
    `).run({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
    });
  } else {
    db.prepare(`
      INSERT INTO google_auth (id, access_token, refresh_token, expiry_date)
      VALUES (1, @access_token, @refresh_token, @expiry_date)
    `).run({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
    });
  }
}

/**
 * Returns an authenticated OAuth2 client, or null if not connected.
 * Automatically refreshes tokens when possible and saves updated tokens.
 */
function getAuthenticatedClient() {
  if (!oauth2Client) return null;
  const stored = getStoredTokens();
  if (!stored || !stored.access_token) return null;

  oauth2Client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: stored.expiry_date,
  });

  // Listen for token refresh events so we persist the new tokens
  oauth2Client.removeAllListeners('tokens');
  oauth2Client.on('tokens', (tokens) => {
    saveTokens({
      access_token: tokens.access_token || stored.access_token,
      refresh_token: tokens.refresh_token || stored.refresh_token,
      expiry_date: tokens.expiry_date || stored.expiry_date,
    });
  });

  return oauth2Client;
}

function getCalendarId() {
  const stored = getStoredTokens();
  return (stored && stored.calendar_id) || 'primary';
}

// ---------------------------------------------------------------------------
// Google Calendar color mapping
// ---------------------------------------------------------------------------
// Google Calendar colorId values (1-11). We map our hex colours to the closest.
const GOOGLE_COLOR_MAP = {
  '#7986cb': '1',  // Lavender
  '#33b679': '2',  // Sage
  '#8e24aa': '3',  // Grape
  '#e67c73': '4',  // Flamingo
  '#f6bf26': '5',  // Banana
  '#f4511e': '6',  // Tangerine
  '#039be5': '7',  // Peacock
  '#616161': '8',  // Graphite
  '#3f51b5': '9',  // Blueberry
  '#0b8043': '10', // Basil
  '#d50000': '11', // Tomato
};

function mapColorToGoogleColorId(hex) {
  if (!hex) return '7'; // default Peacock/blue
  const normalized = hex.toLowerCase();
  if (GOOGLE_COLOR_MAP[normalized]) return GOOGLE_COLOR_MAP[normalized];

  // Rough mapping by hue family
  if (normalized.startsWith('#3b82f6') || normalized.startsWith('#2563eb') || normalized.startsWith('#60a5fa')) return '7';
  if (normalized.startsWith('#ef4444') || normalized.startsWith('#dc2626')) return '11';
  if (normalized.startsWith('#22c55e') || normalized.startsWith('#16a34a')) return '2';
  if (normalized.startsWith('#f59e0b') || normalized.startsWith('#eab308')) return '5';
  if (normalized.startsWith('#a855f7') || normalized.startsWith('#8b5cf6')) return '3';
  if (normalized.startsWith('#f97316')) return '6';
  if (normalized.startsWith('#6b7280') || normalized.startsWith('#64748b')) return '8';

  return '7'; // fallback
}

// ---------------------------------------------------------------------------
// Google Calendar sync helpers
// ---------------------------------------------------------------------------

async function pushEventToGoogle(event) {
  const auth = getAuthenticatedClient();
  if (!auth) return null;

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = getCalendarId();

  const resource = {
    summary: event.title,
    description: event.description || '',
    start: { dateTime: event.start_time, timeZone: 'Europe/Stockholm' },
    end: { dateTime: event.end_time, timeZone: 'Europe/Stockholm' },
    colorId: mapColorToGoogleColorId(event.color),
  };

  try {
    let googleEvent;
    if (event.google_event_id) {
      // Update existing
      googleEvent = await calendar.events.update({
        calendarId,
        eventId: event.google_event_id,
        resource,
      });
    } else {
      // Insert new
      googleEvent = await calendar.events.insert({
        calendarId,
        resource,
      });
    }

    const googleEventId = googleEvent.data.id;

    // Persist the google reference back to our DB
    db.prepare('UPDATE events SET google_event_id = ?, google_calendar_id = ? WHERE id = ?')
      .run(googleEventId, calendarId, event.id);

    return googleEventId;
  } catch (err) {
    console.error('pushEventToGoogle failed:', err.message);
    return null;
  }
}

async function deleteEventFromGoogle(googleEventId) {
  const auth = getAuthenticatedClient();
  if (!auth) return;

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = getCalendarId();

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (err) {
    // Event may already be deleted on Google side - that's fine
    if (err?.code !== 410 && err?.code !== 404) {
      console.error('deleteEventFromGoogle failed:', err.message);
    }
  }
}

// ---------------------------------------------------------------------------
// LOCAL EVENTS CRUD
// ---------------------------------------------------------------------------

// GET /api/calendar/events
router.get('/events', (req, res) => {
  try {
    const { start, end, lead_id } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query parameters are required' });
    }

    let sql = `
      SELECT e.*, l.company AS lead_company
      FROM events e
      LEFT JOIN leads l ON e.lead_id = l.id
      WHERE e.start_time >= @start AND e.end_time <= @end
    `;
    const params = { start, end };

    if (lead_id) {
      const leadIdNum = Number(lead_id);
      if (!Number.isInteger(leadIdNum) || leadIdNum <= 0) {
        return res.status(400).json({ error: 'lead_id must be a positive integer' });
      }
      sql += ' AND e.lead_id = @lead_id';
      params.lead_id = leadIdNum;
    }

    sql += ' ORDER BY e.start_time ASC';

    const events = db.prepare(sql).all(params);
    res.json(events);
  } catch (err) {
    console.error('GET /events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/calendar/events
router.post('/events', async (req, res) => {
  try {
    const { title, description, event_type, start_time, end_time, lead_id, color } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'title, start_time, and end_time are required' });
    }

    if (isNaN(new Date(start_time).getTime())) {
      return res.status(400).json({ error: 'start_time must be a valid ISO date string' });
    }

    if (isNaN(new Date(end_time).getTime())) {
      return res.status(400).json({ error: 'end_time must be a valid ISO date string' });
    }

    const result = db.prepare(`
      INSERT INTO events (title, description, event_type, start_time, end_time, lead_id, color)
      VALUES (@title, @description, @event_type, @start_time, @end_time, @lead_id, @color)
    `).run({
      title,
      description: description || null,
      event_type: event_type || 'other',
      start_time,
      end_time,
      lead_id: lead_id || null,
      color: color || '#3b82f6',
    });

    const created = db.prepare(`
      SELECT e.*, l.company AS lead_company
      FROM events e
      LEFT JOIN leads l ON e.lead_id = l.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    // Push to Google Calendar (non-blocking, errors don't fail the local op)
    if (getAuthenticatedClient()) {
      pushEventToGoogle(created).catch((err) =>
        console.error('Background Google push failed:', err.message)
      );
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('POST /events error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/calendar/events/:id
router.put('/events/:id', validateId('id'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id must be a positive integer' });
    }

    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const fields = ['title', 'description', 'event_type', 'start_time', 'end_time', 'lead_id', 'color'];
    const updates = [];
    const params = { id: Number(id) };

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);
        params[field] = req.body[field];
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");

    db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = @id`).run(params);

    const updated = db.prepare(`
      SELECT e.*, l.company AS lead_company
      FROM events e
      LEFT JOIN leads l ON e.lead_id = l.id
      WHERE e.id = ?
    `).get(id);

    // Sync update to Google Calendar
    if (updated.google_event_id && getAuthenticatedClient()) {
      pushEventToGoogle(updated).catch((err) =>
        console.error('Background Google update failed:', err.message)
      );
    }

    res.json(updated);
  } catch (err) {
    console.error('PUT /events/:id error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', validateId('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete from Google first
    if (existing.google_event_id && getAuthenticatedClient()) {
      await deleteEventFromGoogle(existing.google_event_id);
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('DELETE /events/:id error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ---------------------------------------------------------------------------
// GOOGLE CALENDAR INTEGRATION
// ---------------------------------------------------------------------------

// GET /api/calendar/google/status
router.get('/google/status', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    if (!auth) {
      return res.json({ connected: false });
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = getCalendarId();

    // Verify the tokens still work
    const calList = await calendar.calendarList.get({ calendarId });
    res.json({
      connected: true,
      email: calList.data.id || null,
      calendarId,
    });
  } catch (err) {
    console.error('Google status check failed:', err.message);
    // Tokens are invalid / expired without refresh token
    res.json({ connected: false });
  }
});

// GET /api/calendar/google/auth-url
router.get('/google/auth-url', (req, res) => {
  // Reload credentials in case they were added after startup
  loadCredentials();

  if (!oauth2Client) {
    return res.status(400).json({
      error: 'no_credentials',
      message: 'Google credentials not configured',
    });
  }

  const state = crypto.randomUUID();
  pendingOAuthStates.set(state, Date.now());

  // Clean up states older than 10 minutes
  for (const [key, timestamp] of pendingOAuthStates) {
    if (Date.now() - timestamp > 10 * 60 * 1000) pendingOAuthStates.delete(key);
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });

  res.json({ url });
});

// GET /api/calendar/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    if (!state || !pendingOAuthStates.has(state)) {
      return res.status(403).send('Invalid or expired OAuth state');
    }
    pendingOAuthStates.delete(state);

    if (!oauth2Client) {
      return res.status(500).send('OAuth client not configured');
    }

    const { tokens } = await oauth2Client.getToken(code);
    saveTokens(tokens);
    oauth2Client.setCredentials(tokens);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?google=connected`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    res.status(500).send('Failed to complete Google authentication');
  }
});

// POST /api/calendar/google/disconnect
router.post('/google/disconnect', (req, res) => {
  try {
    db.prepare('DELETE FROM google_auth WHERE id = 1').run();
    res.json({ message: 'Disconnected' });
  } catch (err) {
    console.error('Google disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// POST /api/calendar/google/sync
router.post('/google/sync', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    if (!auth) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = getCalendarId();

    // Date range: 30 days back, 60 days forward
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all events from Google in the range (paginate)
    const googleEvents = [];
    let pageToken = null;
    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
        pageToken: pageToken || undefined,
      });
      if (response.data.items) {
        googleEvents.push(...response.data.items);
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    let created = 0;
    let updated = 0;

    const googleEventIds = new Set();

    const upsertEvent = db.transaction((gEvent) => {
      const googleEventId = gEvent.id;
      googleEventIds.add(googleEventId);

      const startTime = gEvent.start?.dateTime || gEvent.start?.date || null;
      const endTime = gEvent.end?.dateTime || gEvent.end?.date || null;
      if (!startTime || !endTime) return; // skip all-day events without dateTime

      const existing = db.prepare('SELECT * FROM events WHERE google_event_id = ?').get(googleEventId);

      if (existing) {
        db.prepare(`
          UPDATE events
          SET title = ?, description = ?, start_time = ?, end_time = ?,
              google_calendar_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          gEvent.summary || '(No title)',
          gEvent.description || null,
          startTime,
          endTime,
          calendarId,
          existing.id
        );
        updated++;
      } else {
        db.prepare(`
          INSERT INTO events (title, description, start_time, end_time, google_event_id, google_calendar_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          gEvent.summary || '(No title)',
          gEvent.description || null,
          startTime,
          endTime,
          googleEventId,
          calendarId
        );
        created++;
      }
    });

    // Process each Google event
    for (const gEvent of googleEvents) {
      upsertEvent(gEvent);
    }

    // Mark local events whose Google counterpart has been deleted
    const localGoogleEvents = db.prepare(
      'SELECT id, google_event_id FROM events WHERE google_event_id IS NOT NULL'
    ).all();

    for (const local of localGoogleEvents) {
      if (!googleEventIds.has(local.google_event_id)) {
        db.prepare('UPDATE events SET google_event_id = NULL, google_calendar_id = NULL WHERE id = ?')
          .run(local.id);
      }
    }

    res.json({
      synced: googleEvents.length,
      created,
      updated,
    });
  } catch (err) {
    console.error('Google sync error:', err);
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
});

export default router;
