/* ═══════════════════════════════════════════════════════════
   SANGAMAM 2026 — front-end configuration

   ⚠ PUBLIC FILE. Everything here is visible to anyone who
   opens the page. That is fine for all of it — a UPI id is
   meant to be public, the same way a QR poster is.
   ═══════════════════════════════════════════════════════════ */

window.SANGAMAM_CONFIG = {

  // ── UPI collection account ──────────────────────────────
  // The VPA money is paid into, e.g. "santhomeyouth@okicici".
  // Use the parish / youth account, never a personal one.
  //
  // ⚠ TEMPORARY TEST VALUE — deliberately an invalid VPA (not a real
  //   handle, so no stranger's account could ever receive money). A UPI
  //   app will still open and show the amount, but the payment itself
  //   is rejected once the app checks the id. REPLACE with the real
  //   parish/Santhome Youth VPA before this page is shared with anyone.
  UPI_VPA: "test-dummy-id@invalid",

  // Name shown inside the payer's UPI app. Keep it recognisable
  // so people know the payment reached the right place.
  UPI_PAYEE_NAME: "Santhome Youth",

  // ── Backend ─────────────────────────────────────────────
  // Apps Script web-app URL, ending in /exec.
  //
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbwrVaYeYcuBGCJE6iewBHFaAcJsildA_PDo2gAaImvEW-gvABYe1tHtSBGMRb7dF-NySA/exec",

  // ── Event ───────────────────────────────────────────────
  ORG_NAME: "Santhome Youth",
  EVENT_NAME: "Sangamam 2026",

  // No minimum contribution for now — left open. Any positive amount
  // is accepted (also enforced this way in the Apps Script backend).
  MAX_TICKETS: 30,

  // Max screenshot size accepted, in MB.
  MAX_UPLOAD_MB: 5
};

/* Until UPI_VPA and BACKEND_URL are both filled in, the booking panel
   stays in preview mode: no QR is shown and nothing is submitted.
   See SETUP.md. */
