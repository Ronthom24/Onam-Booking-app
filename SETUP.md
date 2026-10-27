# Sangamam 2026 — booking setup

Free registration, no payments. People enter their name, mobile number and
ticket count; each booking lands as a row in a Google Sheet and they get a
booking ID back.

```
Booking panel ──► Apps Script ──► Google Sheet
```

Setup takes about 10 minutes.

---

## 1. Google Sheet

1. Create a Sheet named **Sangamam 2026 Bookings**.
2. Copy the ID from the URL:
   `docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`

The `Bookings` tab is created automatically on the first submission:

| Timestamp | Booking ID | Name | Phone | Email | Tickets | Status | Notes |
|---|---|---|---|---|---|---|---|

> If you used an earlier version of this backend, the existing `Bookings`
> tab has different columns. Rename or delete it before the first booking so
> the new layout is created.

Export any time: **File ▸ Download ▸ Microsoft Excel (.xlsx)**.

## 2. Apps Script backend

1. In the Sheet: **Extensions ▸ Apps Script**.
2. Replace the placeholder code with everything from `backend/Code.gs`.
3. Fill in `setSecrets()` with your Sheet ID, select **`setSecrets`** in the
   function dropdown, **Run** it once, grant permissions. The log should
   print the ID and "Sheet opens OK".
   *(The name has no trailing underscore on purpose — Apps Script hides
   `name_` functions from the Run dropdown, so they cannot be run.)*
4. **Leave the ID in the file.** Blanking it and running again wipes the
   stored value and everything fails with "Invalid argument: id".
5. **Deploy ▸ New deployment ▸ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the `/exec` URL.

> After any later edit to the Apps Script code, use **Deploy ▸ Manage
> deployments ▸ New version**, or the live URL keeps serving the old code.

## 3. Connect the page

In `config.js`:

```js
BACKEND_URL:   "https://script.google.com/macros/s/AKfy…/exec",
BOOKINGS_OPEN: true,
```

Reload. The "Bookings open soon" notice disappears and booking goes live.

---

## 4. Test before announcing

- [ ] Book 2 tickets — a row appears in the Sheet with Tickets = 2 and Status `BOOKED`
- [ ] The confirmation screen shows the same booking ID as the row
- [ ] Try a 9-digit phone number — the button stays disabled
- [ ] Try a bad email address — the button stays disabled

---

## Testing the lucky draw

Do this once, before the day, so nothing is a surprise on stage.

1. In the Apps Script editor, run **`seedTestBookings()`** — adds 9 fake
   bookings (7 `BOOKED`, 2 `CANCELLED`) to the sheet.
2. Run **`drawWinner()`** a few times. Each run logs a winner and adds a
   row to the **Draw** tab.
3. Check as you go:
   - [ ] The winner is never Rebecca Samuel or George Abraham (they are
     `CANCELLED` — they are the trap)
   - [ ] The log says **19 entries, 2 bookings excluded**
   - [ ] Leena Kurian (6 tickets) comes up noticeably more than
     Anil Varghese (1 ticket) over ~15 runs
4. Run **`clearTestBookings()`** to remove them. It only deletes rows
   marked `TEST` in the Notes column — real bookings are never touched.

> Run `clearTestBookings()` before real bookings start, or the fake
> names will be sitting in the draw on the day.

### On the day

1. Mark anyone who has told you they're not coming as `CANCELLED`
   (**🌼 Sangamam ▸ Mark selected as CANCELLED**) so they leave the headcount
   and the draw.
2. Run `drawWinner()`.
3. Read the winner from the log, and check the **Draw** tab, which records
   the time, the winner and the total entry count, so the result is
   auditable if anyone asks.

---

## Day-to-day

- **🌼 Sangamam ▸ Refresh summary** builds a live **Summary** tab: bookings,
  tickets, leaves to lay, draw entries, cancellations.
- `reportTotals()` in the Apps Script editor logs the same headcount.

---

## Notes

**Personal data.** The Sheet holds names, phone numbers and emails. Share it
with only the volunteers who need it.
