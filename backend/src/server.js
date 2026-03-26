import express from 'express';
import cors from 'cors';
import leadsRouter from './routes/leads.js';
import notesRouter from './routes/notes.js';
import manuscriptRouter from './routes/manuscript.js';
import { seedManuscript } from './routes/manuscript.js';
import contactsRouter from './routes/contacts.js';
import listsRouter from './routes/lists.js';
import calendarRouter from './routes/calendar.js';
import { startCSVWatcher } from './csvWatcher.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Auto-seed manuscript on first startup
const seeded = seedManuscript();
if (seeded) {
  console.log('Manuscript seeded with default Swedish cold-calling data.');
}

app.listen(PORT, () => {
  console.log(`Salestool backend running on http://localhost:${PORT}`);
  startCSVWatcher();
});
