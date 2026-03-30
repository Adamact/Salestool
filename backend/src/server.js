import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import leadsRouter from './routes/leads.js';
import notesRouter from './routes/notes.js';
import manuscriptRouter from './routes/manuscript.js';
import { seedManuscript } from './routes/manuscript.js';
import contactsRouter from './routes/contacts.js';
import listsRouter from './routes/lists.js';
import calendarRouter from './routes/calendar.js';
import { startCSVWatcher } from './csvWatcher.js';
import { createBackup } from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim()),
}));

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/api/leads', leadsRouter);
app.use('/api/leads', notesRouter);
app.use('/api/leads', contactsRouter);
app.use('/api/manuscript', manuscriptRouter);
app.use('/api/lists', listsRouter);
app.use('/api/calendar', calendarRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database backup
const backupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
app.post('/api/backup', backupLimiter, (req, res) => {
  try {
    const backupPath = createBackup();
    res.json({ message: 'Backup created', path: backupPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-seed manuscript on first startup
const seeded = seedManuscript();
if (seeded) {
  console.log('Manuscript seeded with default Swedish cold-calling data.');
}

app.listen(PORT, () => {
  console.log(`Salestool backend running on http://localhost:${PORT}`);
  startCSVWatcher();

  // Auto-backup on startup
  try {
    createBackup();
    console.log('Database backup created on startup.');
  } catch (err) {
    console.error('Failed to create startup backup:', err.message);
  }
});
