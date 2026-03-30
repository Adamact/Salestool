# Daily Workflow Guide

A practical guide for your day-to-day cold calling routine using Salestool.

---

## Morning Setup

1. **Start the app** - Run `npm run dev` and open http://localhost:5173
2. **Check the stats bar** - See yesterday's carry-over stats and today's starting point
3. **Review the callback queue** - The sidebar widget shows overdue and upcoming callbacks. Handle overdue ones first.
4. **Open your call script** - Click the script icon in the stats bar to float the script overlay

---

## Calling Workflow

### Standard mode

1. Press **N** to get the next prioritized lead
2. Review the lead in the focus panel (company info, contacts, previous notes, call history)
3. Make the call
4. Press **Enter** to log the outcome
5. Add notes if relevant
6. Repeat

### Power Dial mode

For high-volume sessions when you want to minimize clicks:

1. Toggle **Power Dial** in the stats bar
2. After logging each call, the app automatically advances to the next lead
3. No need to press N - just log and go

### Working a specific list

1. Open **Lists** (`Ctrl+K` > "lists") and select your target list
2. The sidebar filters to only show leads in that list
3. Press **N** - the smart next lead respects the active list filter
4. Leads in the list are shown in your custom sort order

---

## During a Call

### Quick reference

- The **floating script** overlay stays visible while you work
- Switch between manuscript groups for different campaigns
- The **Contacts** tab shows all contacts for the company with phone numbers

### Logging the outcome

Press **Enter** or click "Logga samtal":

| Outcome | When to use | What happens |
|---------|-------------|-------------|
| **Inget svar** | No one picked up | Status -> `no_answer`, lead deprioritized |
| **Aterring** | They asked you to call back | Status -> `callback`, set date/time, appears in callback queue |
| **Intresserad** | Positive response, follow up needed | Status -> `interested` |
| **Bokat mote** | Meeting scheduled | Status -> `booked_meeting`, celebration animation |
| **Ej intresserad** | Clear no | Status -> `not_interested`, removed from calling queue |
| **Redan kund** | Already a customer | Status -> `already_customer`, removed from calling queue |
| **Fel nummer** | Wrong/invalid number | Status -> `wrong_number`, removed from calling queue |
| **Skickat mejl** | Sent an email | No status change, logged for tracking |
| **Skickat uppfoljning** | Sent follow-up material | No status change, logged for tracking |

**Tip:** Use number keys **1-9** to quickly select an outcome.

### Adding notes

- Use the **Notes** tab in the focus panel for quick notes
- Notes are timestamped and shown newest-first
- The **Timeline** tab shows a unified view of notes and call history

### Managing contacts

- The **Contacts** tab shows all contacts for the company
- Click **+** to add a new contact
- Set one as primary (shown in the lead card)
- Track name, title, phone, mobile, email, department, and LinkedIn

---

## Callback Management

### Setting a callback

1. Log a call with outcome **Aterring** (Callback)
2. Set the date and time
3. The lead appears in the callback queue sidebar widget

### Working callbacks

The callback queue shows:
- **Overdue** callbacks at the top (highlighted)
- **Upcoming** callbacks sorted by time
- Click any callback to jump to that lead

The **smart next lead** (N key) automatically prioritizes overdue callbacks above all other leads.

---

## End of Day

### Review your session

1. Open **Analytics** from the stats bar
2. Check today's metrics:
   - Total calls made
   - Connect rate (calls where someone answered)
   - Conversion rate (interested + booked meetings)
   - Meetings booked
3. Compare with the previous period using the date picker

### Export results

If you need to share progress:
- Click **Export** in the sidebar to download leads as CSV
- Filter by status (e.g., export only "interested" leads)
- Filter by list for campaign-specific exports

---

## Weekly Tasks

### Review analytics

Use the date range picker to look at the full week:
- Which hours had the best connect rate?
- Which industries/cities converted best?
- How effective were your callbacks?

### Clean up lists

- Archive completed campaigns
- Create new lists for next week's targets
- Import fresh leads from new spreadsheets

### Update scripts

- Edit manuscript sections based on what's working
- Create new manuscript groups for different campaigns
- Duplicate a working group as a starting point

---

## Tips & Tricks

1. **Ctrl+K is your friend** - The command palette is the fastest way to do anything
2. **Use lists for campaigns** - Create a list per campaign, import targeted leads, filter by list
3. **Take notes on every call** - Even "no answer" calls benefit from a quick note ("called 3pm, voicemail full")
4. **Review callbacks before lunch** - Morning callbacks are freshest in the prospect's mind
5. **Use the timeline tab** - See the full history of interactions before calling back
6. **Power Dial for cold lists** - Use power dial when working through a fresh import, standard mode for callbacks and warm leads
7. **Export regularly** - Export "interested" and "booked_meeting" leads weekly for your CRM or manager
