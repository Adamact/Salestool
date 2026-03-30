# Getting Started Guide

Welcome to Salestool! This guide walks you through setup, first steps, and daily usage so you can start making calls quickly.

---

## 1. Installation

### Prerequisites

- **Node.js 18+** ([download](https://nodejs.org/))
- **npm** (comes with Node.js)

### Setup

```bash
git clone <repo-url>
cd Salestool
npm run install:all
```

### Configuration (optional)

Copy the environment template and adjust if needed:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origins (comma-separated) |
| `FRONTEND_URL` | `http://localhost:5173` | Redirect URL after Google OAuth |

For local development, the defaults work out of the box.

### Start the app

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. Both the backend (port 3001) and frontend (port 5173) start together.

---

## 2. Importing Your First Leads

You have three ways to get leads into the system:

### Option A: Excel/CSV Import (recommended for bulk)

1. Click the **Import** button in the sidebar header
2. Select an `.xlsx`, `.xls`, or `.csv` file (max 10 MB, 10,000 rows)
3. The system auto-detects column headers in both Swedish and English:
   - `Foretag` / `Company`
   - `Kontaktperson` / `Contact`
   - `Telefon` / `Phone`
   - `E-post` / `Email`
   - `Stad` / `City`
   - `Bransch` / `Industry`
4. Unrecognized columns are stored as custom fields
5. Duplicate companies (by name, case-insensitive) are automatically skipped

### Option B: Add manually

1. Click the **+** button in the sidebar header
2. Fill in company name (required) and any other fields
3. Click **Spara** (Save)

### Option C: Auto-import via inbox folder

Drop `.csv`, `.xlsx`, or `.xls` files into `backend/data/inbox/`. They are automatically imported as a new list and moved to `backend/data/inbox/processed/`.

---

## 3. Your First Calling Session

### Navigating leads

- The **sidebar** (left) shows your lead list with search, status filters, and city filters
- Click a lead to open its details in the **focus panel** (right)
- Use **Arrow Up/Down** to navigate between leads
- Press **N** to jump to the smart next lead (prioritizes overdue callbacks, then new leads)

### Logging a call

1. Select a lead and press **Enter** (or click "Logga samtal")
2. Choose an outcome:
   - `Inget svar` (No answer)
   - `Aterring` (Callback) - set a callback date/time
   - `Intresserad` (Interested)
   - `Ej intresserad` (Not interested)
   - `Bokat mote` (Booked meeting) - triggers celebration animation!
   - `Redan kund` (Already customer)
   - `Fel nummer` (Wrong number)
   - `Skickat mejl` (Sent email)
   - `Skickat uppfoljning` (Sent follow-up)
3. Optionally add notes and call duration
4. Press **Ctrl+Enter** or click Save

The lead's status updates automatically based on the outcome.

### Using keyboard shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Log a call for selected lead |
| `N` | Jump to smart next lead |
| `Arrow Up/Down` | Navigate lead list |
| `1-9` | Select outcome in log call dialog |
| `Ctrl+K` | Open command palette |
| `Escape` | Close any open panel |

### Power Dial Mode

Toggle Power Dial in the stats bar to auto-advance to the next lead after each call. Great for high-volume calling sessions.

---

## 4. Using the Call Script

The app comes with Swedish cold-calling templates:

1. Click the **script icon** in the stats bar to open the floating script overlay
2. The script stays visible while you work with leads
3. Sections include: Opening, Value Proposition, Questions, Closing, and Objection Handling

### Editing scripts

1. Open a lead's **Manus** (Manuscript) tab in the focus panel
2. Use the split-panel editor to modify sections
3. Create multiple manuscript groups for different campaigns
4. Set one group as active to use during calls

---

## 5. Organizing with Lists

Lists help you segment leads for targeted campaigns:

1. Click **Lists** in the sidebar or press `Ctrl+K` and type "lists"
2. Create a new list with a name, description, and color
3. In the sidebar, enable **multi-select mode** (checkbox icon)
4. Check leads and use the dropdown to add them to a list
5. Filter the sidebar by list using the list selector dropdown

---

## 6. Tracking Callbacks

When you log a call with the "Callback" outcome:

1. Set the callback date and time
2. The lead moves to "callback" status
3. The **Callback Queue** widget in the sidebar shows upcoming and overdue callbacks
4. It auto-refreshes every 30 seconds
5. Overdue callbacks are highlighted and prioritized by the smart next lead system

---

## 7. Calendar

Open the calendar view from the stats bar:

- Create events for calling blocks, meetings, and follow-ups
- Link events to specific leads
- Color-code by event type

### Google Calendar Sync (optional)

1. Create a Google Cloud project and enable the Calendar API
2. Create OAuth 2.0 credentials (Desktop app type)
3. Save as `backend/data/google-credentials.json`:
   ```json
   {
     "client_id": "your-client-id",
     "client_secret": "your-client-secret",
     "redirect_uri": "http://localhost:3001/api/calendar/google/callback"
   }
   ```
4. In the Calendar view, click **Connect Google Calendar**
5. Authorize the app
6. Events sync both ways

---

## 8. Analytics

Open the analytics dashboard from the stats bar to see:

- **KPIs**: Total calls, connect rate, conversion rate, meetings booked
- **Calls by hour**: See which hours are most productive
- **Outcome distribution**: Breakdown of all call results
- **Conversion funnel**: Leads contacted -> interested -> booked meeting
- **Daily trends**: Call volume over time
- **Industry & city breakdown**: Which segments convert best
- **Callback effectiveness**: How many callbacks convert

Use the date range picker to analyze any time period. The dashboard compares against the previous period of equal length.

---

## 9. Data & Backups

- All data lives locally in `backend/data/salestool.db`
- The database is gitignored (never pushed to version control)
- Automatic backups are created on each server start (last 7 kept)
- Manual backup: click the backup button or `POST /api/backup`
- Backups are stored in `backend/data/backups/`

### Exporting leads

Use the **Export** button in the sidebar or call `GET /api/leads/export?status=interested` to download a CSV.

---

## 10. Command Palette

Press **Ctrl+K** to open the command palette. Type to search:

- **Lead names**: Jump directly to any lead
- **Actions**: Log call, next lead, add lead, import, lists, calendar, analytics, toggle script, power dial

This is the fastest way to navigate the app.
