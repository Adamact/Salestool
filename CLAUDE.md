# Salestool - Cold Calling Dashboard

## Tech Stack
- Frontend: React + Vite (port 5173)
- Backend: Node.js + Express (port 3001)
- Database: SQLite (better-sqlite3) at backend/data/salestool.db

## Development
- `npm run install:all` - Install all dependencies
- `npm run dev` - Start both frontend and backend
- Frontend proxies /api requests to backend

## Project Structure
- /frontend - React app with Vite
- /backend - Express API server with SQLite
- /backend/data - SQLite database (gitignored)

## Key Features
- Excel import for leads (auto-detects Swedish/English column headers)
- Dashboard with lead list + focus panel
- Call script and objection handling (invändningar)
- Call logging with auto-status updates
- Notes per lead
- Call history tracking
