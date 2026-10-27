/* ═══════════════════════════════════════════════════════════
   SANGAMAM 2026 — Google Apps Script backend
   Receives a free booking (name, phone, ticket count) and appends
   a row to the Bookings sheet. No payment is taken or recorded.

   Status model:
   BOOKED    : the normal state. Counted for food and in the draw.
   CANCELLED : someone told you their plans changed. Excluded from the
               headcount and the draw.

   Deploy: Extensions ▸ Apps Script ▸ Deploy ▸ New deployment
           Type "Web app", Execute as "Me", Access "Anyone".
   ═══════════════════════════════════════════════════════════ */

function cfg_() {
  var p = PropertiesService.getScriptProperties();
  return {
    sheetId:    p.getProperty('SHEET_ID'),
    maxTickets: Number(p.getProperty('MAX_TICKETS') || 30)
  };
}

/**
 * Fill in the Sheet ID and RUN THIS ONCE from the editor.
 *
 * NOTE: no trailing underscore in the name. Apps Script hides any
 * function ending in "_" from the Run dropdown, so it could never be run.
 *
 * Leave the value in place afterwards. If you blank it and run this
 * again, it overwrites the stored value with an empty string and every
 * other function fails with "Invalid argument: id".
 */
function setSecrets() {
  PropertiesService.getScriptProperties().setProperties({
    SHEET_ID:    'id_from_your_sheet_url',
    MAX_TICKETS: '30'
  });
  checkConfig();
}

/** Run this any time to see what is actually stored. */
function checkConfig() {
  var c = cfg_();
  console.log('SHEET_ID : ' + (c.sheetId || '*** MISSING ***'));
  if (!c.sheetId) {
    console.log('\n>> SHEET_ID is empty. Put the ID back into setSecrets() and run it again.');
    return;
  }
  try {
    var name = SpreadsheetApp.openById(c.sheetId).getName();
    console.log('Sheet opens OK : "' + name + '"');
  } catch (e) {
    console.log('Cannot open that SHEET_ID — check you copied it correctly.');
  }
}

var HEADERS = [
  'Timestamp', 'Booking ID', 'Name', 'Phone', 'Email',
  'Tickets', 'Status', 'Notes'
];

// ─────────── ROUTING ───────────

function doGet() {
  return json_({ ok: true, service: 'Sangamam 2026 booking backend' });
}

function doPost(e) {
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (body.action === 'submitBooking') return submitBooking_(body);
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error(err && err.stack ? err.stack : String(err));
    return json_({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}

// ─────────── SUBMIT BOOKING ───────────

function submitBooking_(b) {
  var c = cfg_();
  if (!c.sheetId) return json_({ ok: false, error: 'Bookings are not configured yet.' });

  var name  = String(b.name  || '').trim();
  var phone = String(b.phone || '').replace(/\D/g, '');
  var email = String(b.email || '').trim();
  var tickets = Math.floor(Number(b.tickets));

  if (name.length < 2)     return json_({ ok:false, error:'Please enter your name.' });
  if (phone.length !== 10) return json_({ ok:false, error:'Enter a valid 10-digit mobile number.' });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
                           return json_({ ok:false, error:'That email address looks wrong.' });
  if (!(tickets >= 1 && tickets <= c.maxTickets))
                           return json_({ ok:false, error:'Choose between 1 and ' + c.maxTickets + ' tickets.' });

  var bookingId = 'SGM' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyMMdd') +
                  '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    getSheet_().appendRow([
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
      bookingId, name, "'" + phone, email,
      tickets, 'BOOKED', ''
    ]);
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true, bookingId: bookingId });
}

// ─────────── SHEET ───────────

function getSheet_() {
  var ss = SpreadsheetApp.openById(cfg_().sheetId);
  var sheet = ss.getSheetByName('Bookings');
  if (!sheet) {
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3e6cd');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ─────────── HELPERS ───────────

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════════ ORGANISER TOOLS ═══════════════
   Adds a "Sangamam" menu to the sheet so volunteers never need to open
   the script editor. Reload the spreadsheet once after pasting this. */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🌼 Sangamam')
    .addItem('Refresh summary',                'buildSummary')
    .addSeparator()
    .addItem('Mark selected as CANCELLED',     'markSelectedCancelled')
    .addItem('Undo (back to BOOKED)',          'markSelectedBooked')
    .addSeparator()
    .addItem('Draw lucky winner',              'drawWinner')
    .addSeparator()
    .addItem('Add test bookings',              'seedTestBookings')
    .addItem('Remove test bookings',           'clearTestBookings')
    .addToUi();
}

/**
 * Live Summary tab. Uses formulas rather than pasted values, so the
 * numbers keep updating themselves as bookings arrive.
 */
function buildSummary() {
  var ss = SpreadsheetApp.openById(cfg_().sheetId);
  var s = ss.getSheetByName('Summary') || ss.insertSheet('Summary', 0);
  s.clear();

  var B = "'Bookings'!";
  // Everything except rows marked CANCELLED.
  var okB = 'COUNTIFS(' + B + 'B2:B,"<>",' + B + 'G2:G,"<>CANCELLED")';
  var okT = 'SUMIFS('   + B + 'F2:F,'      + B + 'G2:G,"<>CANCELLED")';

  var rows = [
    ['SANGAMAM 2026 — BOOKINGS', ''],
    ['', ''],
    ['Bookings',        '=' + okB],
    ['Tickets',         '=' + okT],
    ['', ''],
    ['Leaves to lay',   '=' + okT],
    ['Draw entries',    '=' + okT],
    ['', ''],
    ['Cancelled',       '=COUNTIF(' + B + 'G2:G,"CANCELLED")'],
    ['', ''],
    ['Last refreshed',  Utilities.formatDate(new Date(), 'Asia/Kolkata', 'd MMM, h:mm a')]
  ];

  s.getRange(1, 1, rows.length, 2).setValues(rows);
  s.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#7c1d2b');
  s.getRange('A3:A4').setFontWeight('bold');
  s.getRange('A6:A7').setFontColor('#0b3a22');
  s.getRange('A9').setFontColor('#7c1d2b');
  s.getRange('B3:B4').setFontSize(12).setFontWeight('bold');
  s.getRange('A11:B11').setFontSize(9).setFontColor('#888888');
  s.setColumnWidth(1, 220);
  s.setColumnWidth(2, 130);
  s.getRange(1, 2, rows.length, 1).setHorizontalAlignment('right');
}

/** Bookings are trusted by default; these two only handle cancellations. */
function markSelectedCancelled() { setStatusOnSelection_('CANCELLED'); }
function markSelectedBooked()    { setStatusOnSelection_('BOOKED');    }

function setStatusOnSelection_(status) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== 'Bookings') {
    SpreadsheetApp.getUi().alert('Open the Bookings tab first, then select the rows.');
    return;
  }
  var n = 0;
  sheet.getActiveRangeList().getRanges().forEach(function (r) {
    for (var i = 0; i < r.getNumRows(); i++) {
      var row = r.getRow() + i;
      if (row < 2) continue;                        // never the header
      sheet.getRange(row, 7).setValue(status);      // Status
      n++;
    }
  });
  buildSummary();
  SpreadsheetApp.getUi().alert('Set ' + n + ' booking(s) to ' + status + '.');
}

/* ─────────────── TESTING THE DRAW ───────────────
   Run seedTestBookings() to fill the sheet with fake bookings, try
   drawWinner() a few times, then clearTestBookings() to remove them.
   Every seeded row is marked TEST in the Notes column, and the clear
   function only ever deletes those — real bookings are never touched. */

function seedTestBookings() {
  var sheet = getSheet_();
  var people = [
    ['Anil Varghese',    '9800000001', 1, 'BOOKED'],
    ['Deepa Mathew',     '9800000002', 4, 'BOOKED'],
    ['Jacob Thomas',     '9800000003', 2, 'BOOKED'],
    ['Leena Kurian',     '9800000004', 6, 'BOOKED'],
    ['Sunil Zachariah',  '9800000005', 1, 'BOOKED'],
    ['Maria Philip',     '9800000006', 3, 'BOOKED'],
    ['Thomas Koshy',     '9800000007', 2, 'BOOKED'],
    ['Rebecca Samuel',   '9800000008', 5, 'CANCELLED'],  // must never win
    ['George Abraham',   '9800000009', 1, 'CANCELLED']   // must never win
  ];
  people.forEach(function (p, i) {
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
      'TEST-' + (i + 1), p[0], "'" + p[1], '',
      p[2], p[3], 'TEST'
    ]);
  });
  console.log('Seeded ' + people.length + ' test bookings ' +
              '(7 BOOKED = 19 entries, 2 CANCELLED = 6 tickets excluded).');
}

function clearTestBookings() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var notes = sheet.getRange(2, 8, last - 1, 1).getValues();    // Notes column
  var removed = 0;
  for (var i = notes.length - 1; i >= 0; i--) {                 // bottom-up
    if (String(notes[i][0]).trim().toUpperCase() === 'TEST') {
      sheet.deleteRow(i + 2);
      removed++;
    }
  }
  console.log('Removed ' + removed + ' test rows. Real bookings untouched.');
}

/**
 * LUCKY DRAW — run from the Apps Script editor on the day.
 *
 * Every TICKET is one entry, so a booking of 4 tickets gets 4 entries.
 * Everyone is eligible except rows marked CANCELLED. The result is
 * written to a "Draw" sheet with the entry count and a timestamp, so
 * the draw is auditable afterwards.
 */
function drawWinner() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) { console.log('No bookings yet.'); return; }

  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var entries = [], skipped = 0;

  rows.forEach(function (r) {
    var tickets = Number(r[5]) || 0;                       // Tickets
    var status  = String(r[6]).trim().toUpperCase();       // Status
    if (status === 'CANCELLED' || tickets < 1) { skipped++; return; }
    for (var i = 0; i < tickets; i++) {
      entries.push({ bookingId: r[1], name: r[2], phone: r[3] });
    }
  });

  if (!entries.length) {
    console.log('No bookings to draw from yet.');
    return;
  }

  var pick = entries[Math.floor(Math.random() * entries.length)];

  var ss = SpreadsheetApp.openById(cfg_().sheetId);
  var d = ss.getSheetByName('Draw');
  if (!d) {
    d = ss.insertSheet('Draw');
    d.appendRow(['Drawn At', 'Booking ID', 'Name', 'Phone', 'Total Entries', 'Bookings Skipped']);
    d.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f3e6cd');
    d.setFrozenRows(1);
  }
  d.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
    pick.bookingId, pick.name, pick.phone, entries.length, skipped
  ]);

  console.log('WINNER: ' + pick.name + ' (' + pick.bookingId + ') · ' + pick.phone +
              '  — from ' + entries.length + ' entries, ' + skipped + ' booking(s) excluded (CANCELLED).');
}

/** Optional: headcount. Run from the editor and read the log. */
function reportTotals() {
  var sheet = getSheet_(), last = sheet.getLastRow();
  if (last < 2) return console.log('No bookings yet.');
  var rows = sheet.getRange(2, 6, last - 1, 2).getValues(); // Tickets, Status
  var t = 0, cancelled = 0;
  rows.forEach(function (r) {
    if (String(r[1]).trim().toUpperCase() === 'CANCELLED') { cancelled++; return; }
    t += Number(r[0]) || 0;
  });
  console.log('Bookings: ' + rows.length + ' | Tickets: ' + t + ' | Cancelled: ' + cancelled);
}
