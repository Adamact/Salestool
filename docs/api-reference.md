# API Reference

Base URL: `http://localhost:3001/api`

All request/response bodies are JSON. Dates are ISO 8601 strings.

---

## Leads

### List leads

```
GET /leads?status=new&city=Stockholm&search=acme&sort_by=company&sort_dir=asc&page=1&limit=50
```

All query parameters are optional.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status |
| `city` | string | - | Filter by city |
| `industry` | string | - | Filter by industry |
| `search` | string | - | Search company, contact, phone, email (case-insensitive, supports Swedish characters) |
| `sort_by` | string | `created_at` | Sort column (id, company, contact_name, phone, email, title, industry, city, status, priority, created_at, updated_at) |
| `sort_dir` | string | `desc` | Sort direction (`asc` or `desc`) |
| `page` | int | `1` | Page number (min 1) |
| `limit` | int | `50` | Results per page (1-200) |

**Response:**
```json
{
  "leads": [{ "id": 1, "company": "Acme AB", "status": "new", "call_count": 3, ... }],
  "total": 150,
  "page": 1,
  "limit": 50,
  "total_pages": 3
}
```

### Get single lead

```
GET /leads/:id
```

Returns lead with `contacts`, `notes_count`, and `last_call_date` included.

### Create lead

```
POST /leads
```

```json
{
  "company": "Acme AB",
  "contact_name": "Anna Svensson",
  "phone": "+46701234567",
  "email": "anna@acme.se",
  "title": "VD",
  "industry": "IT",
  "city": "Stockholm",
  "status": "new",
  "priority": 3
}
```

- `company` is checked for duplicates (case-insensitive, trimmed)
- Returns `409` with `existing_id` if duplicate found
- `priority` must be 0-5 (defaults to 0)
- If contact info is provided, a primary contact is auto-created

### Update lead

```
PUT /leads/:id
```

Send only the fields you want to update. Same validation as create.

### Delete lead

```
DELETE /leads/:id
```

Cascades to notes, call history, contacts, and list memberships.

### Get next lead (smart priority)

```
GET /leads/next?list_id=5
```

Returns the highest-priority lead to call. Priority order:
1. Overdue callbacks
2. Upcoming callbacks
3. New leads
4. No answer (oldest first)
5. Interested

`list_id` is optional - filters to leads in that list.

### Get callbacks

```
GET /leads/callbacks
```

Returns all leads with status `callback` and their scheduled callback times, sorted by callback time ascending.

### Get stats

```
GET /leads/stats
```

```json
{
  "total": 500,
  "new": 200,
  "callback": 50,
  "interested": 30,
  "calls_today": 45,
  "calls_per_hour": 12
}
```

### Get analytics

```
GET /leads/analytics?start_date=2026-03-01&end_date=2026-03-30
```

Returns KPIs, calls by hour, outcome distribution, funnel, daily trends, industry/city breakdowns, callback effectiveness, and pipeline velocity. Includes previous-period comparison data.

### Export leads as CSV

```
GET /leads/export?status=interested&list_id=3
```

Returns a UTF-8 CSV file with BOM (Excel-compatible). Semicolon-delimited.

### Import leads from Excel/CSV

```
POST /leads/import
Content-Type: multipart/form-data
```

Upload a file with field name `file`. Supports `.xlsx`, `.xls`, `.csv`.

- Max file size: 10 MB
- Max rows: 10,000
- Auto-detects Swedish and English column headers
- Skips duplicate companies

**Response:**
```json
{
  "imported": 45,
  "skipped": 3,
  "skipped_companies": ["Duplicate AB", "Already Exists AB"],
  "message": "Imported 45 leads. Skipped 3 duplicates."
}
```

---

## Notes

### List notes for a lead

```
GET /leads/:id/notes
```

Returns notes sorted by newest first.

### Add note

```
POST /leads/:id/notes
```

```json
{ "text": "Called, asked to call back Thursday." }
```

---

## Call History

### List call history

```
GET /leads/:id/history
```

Returns call records sorted by newest first.

### Log a call

```
POST /leads/:id/history
```

```json
{
  "outcome": "callback",
  "notes": "Busy, call back tomorrow",
  "callback_time": "2026-03-31T10:00:00",
  "duration_seconds": 120
}
```

| Outcome | Lead status update |
|---------|--------------------|
| `no_answer` | `no_answer` |
| `callback` | `callback` |
| `interested` | `interested` |
| `not_interested` | `not_interested` |
| `booked_meeting` | `booked_meeting` |
| `already_customer` | `already_customer` |
| `wrong_number` | `wrong_number` |
| `sent_email` | *(no change)* |
| `sent_followup` | *(no change)* |

---

## Contacts

### List contacts for a lead

```
GET /leads/:id/contacts
```

### Add contact

```
POST /leads/:id/contacts
```

```json
{
  "name": "Erik Johansson",
  "title": "Inkopschef",
  "phone": "+46701234567",
  "phone_mobile": "+46761234567",
  "email": "erik@acme.se",
  "department": "Inkop",
  "linkedin": "linkedin.com/in/erikj",
  "is_primary": true
}
```

- First contact for a lead is automatically set as primary
- Setting `is_primary: true` unsets the previous primary

### Update contact

```
PUT /leads/:leadId/contacts/:contactId
```

### Delete contact

```
DELETE /leads/:leadId/contacts/:contactId
```

If the deleted contact was primary, the next oldest contact is promoted.

---

## Lists

### List all lists

```
GET /lists
```

Returns lists with `lead_count` included.

### Create list

```
POST /lists
```

```json
{
  "name": "Tech Companies",
  "description": "IT and SaaS companies in Stockholm",
  "color": "#3b82f6"
}
```

### Update list

```
PUT /lists/:id
```

### Delete list

```
DELETE /lists/:id
```

Cascade-deletes list memberships (leads are not deleted).

### Get leads in a list

```
GET /lists/:id/leads
```

Returns leads ordered by `sort_order`.

### Add leads to a list

```
POST /lists/:id/leads
```

```json
{ "lead_ids": [1, 5, 12, 23] }
```

IDs must be positive integers. Duplicates are silently ignored.

### Remove lead from list

```
DELETE /lists/:id/leads/:leadId
```

### Reorder leads in list

```
PUT /lists/:id/leads/reorder
```

```json
{ "lead_ids": [23, 1, 12, 5] }
```

### Get lists for a lead

```
GET /lists/for-lead/:leadId
```

---

## Manuscript (Call Scripts)

### List manuscript groups

```
GET /manuscript/groups
```

### Create group

```
POST /manuscript/groups
```

```json
{ "name": "Tech Campaign" }
```

### Rename group

```
PUT /manuscript/groups/:id
```

### Delete group

```
DELETE /manuscript/groups/:id
```

If the deleted group was active, another group is auto-activated.

### Duplicate group

```
POST /manuscript/groups/:id/duplicate
```

Creates a copy with all sections.

### Activate group

```
PUT /manuscript/groups/:id/activate
```

### List sections in a group

```
GET /manuscript?group=:groupId
```

### Create section

```
POST /manuscript
```

```json
{
  "section_type": "opening",
  "title": "Intro",
  "content": "Hi, this is...",
  "manuscript_id": 1
}
```

Section types: `opening`, `objection`

### Update section

```
PUT /manuscript/:id
```

### Delete section

```
DELETE /manuscript/:id
```

### Seed defaults

```
POST /manuscript/seed
```

Restores default Swedish cold-calling templates. Creates a new "Standard" group.

---

## Calendar

### List events

```
GET /calendar/events?start=2026-03-01T00:00:00&end=2026-03-31T23:59:59&lead_id=5
```

`start` and `end` are required. `lead_id` is optional.

### Create event

```
POST /calendar/events
```

```json
{
  "title": "Call block",
  "description": "Morning calls",
  "event_type": "call",
  "start_time": "2026-03-31T09:00:00",
  "end_time": "2026-03-31T12:00:00",
  "lead_id": 5,
  "color": "#3b82f6"
}
```

Event types: `meeting`, `call`, `email`, `other`

### Update event

```
PUT /calendar/events/:id
```

### Delete event

```
DELETE /calendar/events/:id
```

### Google Calendar

| Endpoint | Description |
|----------|-------------|
| `GET /calendar/google/status` | Check if Google Calendar is connected |
| `GET /calendar/google/auth-url` | Get OAuth authorization URL |
| `GET /calendar/google/callback` | OAuth callback (browser redirect) |
| `POST /calendar/google/disconnect` | Disconnect Google Calendar |
| `POST /calendar/google/sync` | Sync events with Google Calendar (30 days back, 60 days forward) |

---

## Utility

### Health check

```
GET /health
```

### Create backup

```
POST /backup
```

Returns the backup file path. Rate-limited to 10 requests per minute.
