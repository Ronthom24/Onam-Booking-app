# Sangamam 2026 — Booking Page

**Live:** [sangamam2k26.netlify.app](https://sangamam2k26.netlify.app/)

A single-page site for **Sangamam 2026**, a family get-together organised by
Santhome Youth at St. Thomas Orthodox Maha Edavaka, Bengaluru. It's an event
landing page (schedule, photos, the Maveli/pookalam theming) with a UPI-based
ticket booking panel bolted on — no payment gateway, no KYC.

## How booking works

There's no payment gateway integration. A visitor picks a contribution
amount, the page opens their UPI app with the amount pre-filled via a
`upi://` deep link (and a QR code as a fallback), they pay, then come back
and submit the UPI reference number plus a screenshot as proof.

```
Booking panel ──► UPI app (money goes straight to the parish account)
      │
      └────────► Apps Script ──► Google Sheet + Drive folder
                                        │
                                 volunteer verifies
                                 against bank statement
```

Every submission lands as a row in a Google Sheet, with the screenshot saved
to a Drive folder. **Nothing here proves the money actually arrived** — a
volunteer has to check each row against the real bank statement and flip its
status to `VERIFIED`. Screenshots can be doctored, so the bank statement is
the only source of truth, not the app.

There's also a lucky-draw feature (`drawWinner()` in the Apps Script) that
picks a winner from verified bookings only, weighted by ticket count.

## Structure

```
index.html      Landing page markup (event info, schedule, booking sheet)
styles.css      All styling
script.js       Pookalam animation, countdown, scroll reveals, booking form
                logic, UPI deep-link + QR generation
config.js       Public front-end config — UPI VPA, backend URL, event name,
                max tickets, upload size limit, BOOKINGS_OPEN master switch
backend/Code.gs Google Apps Script — sheet writes, screenshot upload to
                Drive, duplicate-reference rejection, verification helpers,
                lucky draw, seeding/clearing test data
assets/         Event photos + credits.json
vendor/         Bundled qrcode.js (no external CDN dependency)
_headers        Cache-control rules for Netlify/Cloudflare Pages — config.js
                is set to never cache, so flipping BOOKINGS_OPEN takes
                effect immediately for everyone
```

## Setup

Full step-by-step instructions — creating the Sheet and Drive folder,
deploying the Apps Script web app, wiring `config.js`, the pre-launch test
checklist, running/testing the lucky draw, and the daily verification
workflow — are in [SETUP.md](SETUP.md). Read that before touching
`config.js` or deploying.

## Going live

The booking panel only goes live once **all three** are true in
`config.js`:

- `BOOKINGS_OPEN: true`
- `UPI_VPA` is set to the real parish/Santhome Youth handle (not a personal
  or placeholder id)
- `BACKEND_URL` points at a deployed Apps Script web app

Until then it shows "Bookings open soon" and nothing can be submitted,
regardless of whether the other fields happen to be filled in.

## Notes

- No transaction fees — UPI person-to-person transfer is free.
- The Sheet and Drive folder hold personal data (names, phone numbers,
  emails, payment screenshots that may show bank details). Restrict access
  to volunteers who need it, and delete screenshots after the event is
  reconciled.
- An earlier Razorpay-based approach (automatic webhook verification) exists
  in this repo's git history and can be restored if manual verification
  stops scaling.
