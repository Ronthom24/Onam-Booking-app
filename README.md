# Sangamam 2026 — Booking Page

**Live:** [sangamam2k26.netlify.app](https://sangamam2k26.netlify.app/)

A single-page site for **Sangamam 2026**, a family get-together organised by
Santhome Youth at St. Thomas Orthodox Maha Edavaka, Bengaluru. It's an event
landing page (schedule, photos, the Maveli/pookalam theming) with a free
ticket-booking panel — no payments are taken on the site.

## How booking works

A visitor picks a ticket count and enters their name, mobile number and an
optional email. The page sends that to a Google Apps Script web app, which
appends a row to a Google Sheet and returns a booking ID shown on the
confirmation screen.

```
Booking panel ──► Apps Script ──► Google Sheet
```

Bookings are trusted by default (`BOOKED`). Volunteers can mark a row
`CANCELLED` if someone's plans change, which removes it from the headcount
and the lucky draw.

There's also a lucky-draw feature (`drawWinner()` in the Apps Script) that
picks a winner from all non-cancelled bookings, weighted by ticket count.

## Structure

```
index.html      Landing page markup (event info, schedule, booking sheet)
styles.css      All styling
script.js       Pookalam animation, countdown, scroll reveals, booking form
config.js       Public front-end config — backend URL, event name, max
                tickets, BOOKINGS_OPEN master switch
backend/Code.gs Google Apps Script — sheet writes, summary tab, cancel/undo
                menu, lucky draw, seeding/clearing test data
assets/         Event photos + credits.json
_headers        Cache-control rules for Netlify/Cloudflare Pages — config.js
                is set to never cache, so flipping BOOKINGS_OPEN takes
                effect immediately for everyone
```

## Setup

Full step-by-step instructions — creating the Sheet, deploying the Apps
Script web app, wiring `config.js`, the pre-launch test checklist, and
running/testing the lucky draw — are in [SETUP.md](SETUP.md). Read that
before touching `config.js` or deploying.

## Going live

The booking panel only goes live once **both** are true in `config.js`:

- `BOOKINGS_OPEN: true`
- `BACKEND_URL` points at a deployed Apps Script web app running the
  current `backend/Code.gs`

Until then it shows "Bookings open soon" and nothing can be submitted.

## Notes

- The Sheet holds names, phone numbers and emails. Restrict access to
  volunteers who need it.
- Earlier versions of this repo collected UPI payments and payment
  screenshots. That flow has been removed; it remains in git history.
