# Sangamam 2026 — booking setup

No payment gateway, no KYC. People pay by UPI, then submit the reference
number and a screenshot. Everything lands in a Google Sheet, with the
screenshots in a Drive folder.

```
Booking panel ──► UPI app (money goes straight to the parish account)
      │
      └────────► Apps Script ──► Google Sheet + Drive folder
                                        │
                                 volunteer verifies
                                 against bank statement
```

> **Read this bit.** Nothing here proves money arrived. The page records
> what someone *claims* they paid. A volunteer must check each row against
> the bank statement and change Status to `VERIFIED`. Screenshots can be
> edited — treat the bank statement as the only truth.

Setup takes about 20 minutes.

---

## 1. Google Sheet

1. Create a Sheet named **Sangamam 2026 Bookings**.
2. Copy the ID from the URL:
   `docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`

The `Bookings` tab is created automatically on the first submission:

| Timestamp | Booking ID | Name | Phone | Email | Tickets | Per Ticket | Total | UPI Ref / UTR | Screenshot | Status | Verified By | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Export any time: **File ▸ Download ▸ Microsoft Excel (.xlsx)**.

## 2. Drive folder for screenshots

1. Create a Drive folder, e.g. **Sangamam Payment Screenshots**.
2. Copy its ID from the URL: `drive.google.com/drive/folders/`**`THIS_ID`**
3. Keep it private — it will hold people's payment screenshots.

## 3. Apps Script backend

1. In the Sheet: **Extensions ▸ Apps Script**.
2. Replace the placeholder code with everything from `backend/Code.gs`.
3. Fill in `setSecrets()` with your Sheet ID and Folder ID, select
   **`setSecrets`** in the function dropdown, **Run** it once, grant
   permissions. The log should print both IDs and "Sheet opens OK".
   *(The name has no trailing underscore on purpose — Apps Script hides
   `name_` functions from the Run dropdown, so they cannot be run.)*
4. **Leave the IDs in the file.** Blanking them and running again wipes the
   stored values and everything fails with "Invalid argument: id".
5. **Deploy ▸ New deployment ▸ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the `/exec` URL.

## 4. Connect the page

In `config.js`:

```js
UPI_VPA:     "santhomeyouth@okicici",   // the parish/youth UPI id
BACKEND_URL: "https://script.google.com/macros/s/AKfy…/exec",
```

Reload. The preview notice disappears and booking goes live.

> Use the **parish or youth group account**, never a personal UPI id.
> Money is going to whoever owns that VPA.

---

## 5. Test before announcing

- [ ] Book 2 tickets — the amount in your UPI app reads exactly ₹200
- [ ] Pay ₹1 to yourself, submit the real reference + screenshot
- [ ] Row appears in the Sheet, screenshot link opens the right image
- [ ] Submit the same reference twice — second one is rejected
- [ ] Try a 10 MB file — rejected cleanly
- [ ] Try submitting with no screenshot — button stays disabled

---

## Testing the lucky draw

Do this once, before the day, so nothing is a surprise on stage.

1. In the Apps Script editor, run **`seedTestBookings()`** — adds 9 fake
   bookings (6 verified, 3 not) to the sheet.
2. Run **`drawWinner()`** a few times. Each run logs a winner and adds a
   row to the **Draw** tab.
3. Check as you go:
   - [ ] The winner is always one of the 6 **VERIFIED** names
   - [ ] Thomas Koshy, Rebecca Samuel and George Abraham **never** win
     (they are unverified — they are the trap)
   - [ ] The log says **17 entries, 3 unverified bookings excluded**
   - [ ] Leena Kurian (6 tickets) comes up noticeably more than
     Anil Varghese (1 ticket) over ~15 runs
4. Run **`clearTestBookings()`** to remove them. It only deletes rows
   marked `TEST` in the Notes column — real bookings are never touched.

> Run `clearTestBookings()` before real bookings start, or the fake
> names will be sitting in the draw on the day.

### On the day

1. Verify every payment first — **unverified bookings cannot win**, so an
   unverified row means someone who paid is excluded from the draw.
2. Run `drawWinner()`.
3. Read the winner from the log, and check the **Draw** tab, which records
   the time, the winner and the total entry count, so the result is
   auditable if anyone asks.

---

## Verifying bookings (the daily job)

1. Open the bank / UPI statement for the collection account.
2. For each `PENDING VERIFICATION` row, match the **UPI Ref / UTR** and the
   **amount**.
3. Match → set Status to `VERIFIED` and put your name in **Verified By**.
4. No match → call the number in the row. Do not delete the row; set Status
   to `NOT FOUND` and write what happened in **Notes**.

Watch for: the same reference submitted twice, an amount that doesn't match
the ticket count, and screenshots that look edited. The reference number is
the reliable field — a screenshot is only a convenience.

Run `reportTotals()` from the Apps Script editor for a quick count of
tickets, claimed total, verified and pending.

---

## Notes

**Fees.** None. UPI person-to-person collection is free, so a ₹100
contribution arrives as ₹100.

**Refunds.** Send the money back manually and note it in the row.

**Personal data.** The Sheet holds names, phone numbers and emails, and the
Drive folder holds payment screenshots — which may show the payer's bank
details. Share both with only the volunteers who need them, and delete the
screenshots once the event is reconciled.

**If it grows.** If you outgrow manual checking, the earlier Razorpay
approach verifies payments automatically via webhook. That code is in this
repo's history and can be restored.
