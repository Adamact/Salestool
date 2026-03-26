# Salestool - Cold Calling Dashboard

A full-featured cold calling CRM dashboard built for solo sales reps. Manage leads, log calls, handle objections, track callbacks, and analyze your performance — all from one interface.

## Features

- **Lead Management** — Import leads from Excel/CSV, add manually, or drop files into the inbox for auto-import. Duplicate detection by company name.
- **Multi-Contact Support** — Track multiple contacts per company with primary contact designation.
- **Call Logging** — Log call outcomes with one click (or keyboard shortcut). 9 outcomes including callback scheduling, with automatic status updates.
- **Power Dial Mode** — Auto-advance to the next lead after logging a call for uninterrupted calling sessions.
- **Smart Next Lead** — Intelligent lead prioritization: overdue callbacks > new leads > no answer > interested.
- **Call Scripts & Objection Handling** — Built-in manuscript panel with Swedish cold-calling templates. Floating script overlay for reference during calls.
- **Lists & Segmentation** — Organize leads into color-coded lists. Multi-select mode for bulk operations.
- **Calendar** — Week-view calendar with event types (calling blocks, meetings, follow-ups). Optional Google Calendar sync.
- **Analytics** — Calls per hour, outcome distribution, conversion funnel, average call duration, and daily trends with date range filtering.
- **Data Export** — Export leads as CSV, filtered by status or list.
- **Database Backup** — Automatic daily backups on server start, keeping the last 7.
- **Keyboard Shortcuts** — Enter (log call), N (next lead), Arrow keys (navigate leads), 1-9 (select outcome).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| File Import | xlsx |
| Calendar Sync | Google Calendar API |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd Salestool
npm run install:all
```

### Running

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173). Open http://localhost:5173 in your browser.

### Auto-Import

Drop `.csv`, `.xlsx`, or `.xls` files into `backend/data/inbox/` and they will be automatically imported as a new list. Processed files are moved to `backend/data/inbox/processed/`.

## Project Structure

```
Salestool/
├── frontend/                  # React + Vite app
│   └── src/
│       ├── components/        # UI components
│       ├── constants/         # Shared constants (statuses, etc.)
│       ├── hooks/             # useApi hook
│       ├── App.jsx            # Main app layout
│       └── App.css            # Styles
├── backend/                   # Express API server
│   └── src/
│       ├── routes/            # API route handlers
│       │   ├── leads.js       # Lead CRUD, import, export, analytics
│       │   ├── notes.js       # Notes & call history
│       │   ├── contacts.js    # Multi-contact management
│       │   ├── lists.js       # List/segment management
│       │   ├── manuscript.js  # Call scripts & objections
│       │   └── calendar.js    # Events & Google Calendar
│       ├── utils/             # Shared utilities
│       ├── database.js        # SQLite setup, migrations, backup
│       ├── csvWatcher.js      # Inbox file watcher
│       └── server.js          # Express server entry point
├── package.json               # Root scripts (install:all, dev)
└── CLAUDE.md                  # AI assistant instructions
```

## API Overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/leads` | List leads with filtering, search, sorting, pagination |
| `GET /api/leads/next` | Get next prioritized lead to call |
| `GET /api/leads/stats` | Dashboard statistics |
| `GET /api/leads/analytics` | Session analytics with date range |
| `GET /api/leads/export` | Export leads as CSV |
| `POST /api/leads/import` | Upload and import Excel/CSV |
| `POST /api/leads/:id/history` | Log a call outcome |
| `GET /api/leads/:id/contacts` | List contacts for a lead |
| `GET /api/lists` | List all lead lists |
| `GET /api/manuscript` | Get call scripts & objections |
| `GET /api/calendar/events` | Get calendar events |
| `POST /api/backup` | Create database backup |

## Google Calendar Setup (Optional)

1. Create a project in Google Cloud Console
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials (Desktop app)
4. Save the credentials as `backend/data/google-credentials.json`
5. Connect via the Calendar view in the app

## Data & Privacy

- All data is stored locally in `backend/data/salestool.db`
- The database and backups are gitignored — no data is pushed to version control
- No external services are required (Google Calendar is optional)

## License

MIT
