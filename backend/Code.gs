/* ═══════════════════════════════════════════════════════════
   SANGAMAM 2026 — Google Apps Script backend
   Receives a booking + payment screenshot, saves the screenshot
   to Drive and appends a row to the Bookings sheet.

   IMPORTANT: this records a *claim* of payment. Nothing here proves
   money arrived. Bookings are trusted by default (BOOKED); check the
   bank statement when convenient and flag any that did not arrive as
   NOT PAID, which drops them from the headcount and the draw.

   Deploy: Extensions ▸ Apps Script ▸ Deploy ▸ New deployment
           Type "Web app", Execute as "Me", Access "Anyone".
   ═══════════════════════════════════════════════════════════ */

function cfg_() {
  var p = PropertiesService.getScriptProperties();
  return {
    sheetId:      p.getProperty('SHEET_ID'),
    folderId:     p.getProperty('DRIVE_FOLDER_ID'),
    maxTickets:   Number(p.getProperty('MAX_TICKETS') || 30),
    maxUploadMb:  Number(p.getProperty('MAX_UPLOAD_MB') || 5)
  };
}

/**
 * Fill in the two IDs and RUN THIS ONCE from the editor.
 *
 * NOTE: no trailing underscore in the name. Apps Script hides any
 * function ending in "_" from the Run dropdown, so setSecrets_ could
 * never be selected and run.
 *
 * Leave the values in place afterwards. This project is private to your
 * Google account, so there is nothing to hide them from — and if you blank
 * them and run this again, it overwrites the stored values with empty
 * strings and every other function fails with "Invalid argument: id".
 */
function setSecrets() {
  PropertiesService.getScriptProperties().setProperties({
    SHEET_ID:        'id_from_your_sheet_url',
    DRIVE_FOLDER_ID: 'id_from_your_drive_folder_url',
    MAX_TICKETS:     '30',
    MAX_UPLOAD_MB:   '5'
  });
  checkConfig();
}

/** Run this any time to see what is actually stored. */
function checkConfig() {
  var c = cfg_();
  console.log('SHEET_ID        : ' + (c.sheetId  || '*** MISSING ***'));
  console.log('DRIVE_FOLDER_ID : ' + (c.folderId || '*** MISSING ***'));
  if (!c.sheetId) {
    console.log('\n>> SHEET_ID is empty. Put the IDs back into setSecrets() and run it again.');
    return;
  }
  try {
    var name = SpreadsheetApp.openById(c.sheetId).getName();
    console.log('Sheet opens OK  : "' + name + '"');
  } catch (e) {
    console.log('Cannot open that SHEET_ID — check you copied it correctly.');
  }
  try {
    var f = DriveApp.getFolderById(c.folderId).getName();
    console.log('Folder opens OK : "' + f + '"');
  } catch (e) {
    console.log('Cannot open that DRIVE_FOLDER_ID — check you copied it correctly.');
  }
}

var HEADERS = [
  'Timestamp', 'Booking ID', 'Name', 'Phone', 'Email',
  'Tickets', 'Per Ticket (Rs)', 'Total (Rs)',
  'UPI Ref / UTR', 'Screenshot', 'Status', 'Checked By', 'Notes'
];

/* Status model — bookings are trusted by default.
   BOOKED    : the normal state. Counted for food and in the draw.
   NOT PAID  : you checked the statement and the money is not there.
               Excluded from the headcount and the draw until sorted. */

var ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];

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
  var ref   = String(b.ref   || '').trim();
  var tickets   = Math.floor(Number(b.tickets));
  var perTicket = Math.floor(Number(b.perTicket));

  if (name.length < 2)     return json_({ ok:false, error:'Please enter your name.' });
  if (phone.length !== 10) return json_({ ok:false, error:'Enter a valid 10-digit mobile number.' });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
                           return json_({ ok:false, error:'That email address looks wrong.' });
  if (!(tickets >= 1 && tickets <= c.maxTickets))
                           return json_({ ok:false, error:'Choose between 1 and ' + c.maxTickets + ' tickets.' });
  if (!(perTicket > 0))    return json_({ ok:false, error:'Enter a contribution amount.' });
  if (ref.length < 6)      return json_({ ok:false, error:'Enter the UPI reference / UTR number from your payment.' });

  // The page already requires a screenshot; enforce it here too, so a
  // booking can never be recorded without proof attached.
  if (!b.file || !b.file.data)
    return json_({ ok:false, error:'Please attach a screenshot of your payment.' });

  // Reject a reference number already submitted — catches the honest
  // double-submit and the lazy duplicate alike.
  var dup = findByRef_(ref);
  if (dup) return json_({ ok:false, error:'That reference number has already been submitted (booking ' + dup + ').' });

  var bookingId = 'SGM' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyMMdd') +
                  '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  var shotUrl = '';
  if (b.file && b.file.data) {
    var saved = saveScreenshot_(b.file, bookingId, c);
    if (saved.error) return json_({ ok:false, error: saved.error });
    shotUrl = saved.url;
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    getSheet_().appendRow([
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
      bookingId, name, "'" + phone, email,
      tickets, perTicket, tickets * perTicket,
      ref, shotUrl, 'BOOKED', '', ''
    ]);
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true, bookingId: bookingId });
}

// ─────────── SCREENSHOT → DRIVE ───────────

function saveScreenshot_(file, bookingId, c) {
  try {
    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      return { error: 'Upload a PNG, JPG, WEBP or PDF.' };
    }
    var bytes = Utilities.base64Decode(file.data);
    if (bytes.length > c.maxUploadMb * 1024 * 1024) {
      return { error: 'That file is too large (max ' + c.maxUploadMb + ' MB).' };
    }

    var ext  = (file.type === 'application/pdf') ? 'pdf'
             : (file.type === 'image/png') ? 'png'
             : (file.type === 'image/webp') ? 'webp' : 'jpg';
    var blob = Utilities.newBlob(bytes, file.type, bookingId + '.' + ext);

    var folder = c.folderId ? DriveApp.getFolderById(c.folderId) : DriveApp.getRootFolder();
    var saved  = folder.createFile(blob);

    return { url: saved.getUrl() };
  } catch (err) {
    console.error(err);
    return { error: 'Could not save the screenshot. Please try again.' };
  }
}

// ─────────── SHEET ───────────

function findByRef_(ref) {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var rows = sheet.getRange(2, 2, last - 1, 8).getValues(); // Booking ID .. UPI Ref
  var target = ref.toUpperCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][7]).trim().toUpperCase() === target) return rows[i][0];
  }
  return null;
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(cfg_().sheetId);
  var sheet = ss.getSheetByName('Bookings');
  if (!sheet) {
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3e6cd');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(10, 240);
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
    .addItem('Flag selected as NOT PAID',      'markSelectedNotPaid')
    .addItem('Undo flag (back to BOOKED)',     'markSelectedBooked')
    .addSeparator()
    .addItem('Draw lucky winner',           'drawWinner')
    .addSeparator()
    .addItem('Add test bookings',           'seedTestBookings')
    .addItem('Remove test bookings',        'clearTestBookings')
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
  // Everything except rows you have flagged NOT PAID.
  var okB = 'COUNTIFS(' + B + 'B2:B,"<>",' + B + 'K2:K,"<>NOT PAID")';
  var okT = 'SUMIFS('   + B + 'F2:F,'      + B + 'K2:K,"<>NOT PAID")';
  var okA = 'SUMIFS('   + B + 'H2:H,'      + B + 'K2:K,"<>NOT PAID")';

  var rows = [
    ['SANGAMAM 2026 — BOOKINGS', ''],
    ['', ''],
    ['Bookings',        '=' + okB],
    ['Tickets',         '=' + okT],
    ['Amount',          '=' + okA],
    ['', ''],
    ['Leaves to lay',   '=' + okT],
    ['Draw entries',    '=' + okT],
    ['', ''],
    ['Needs follow-up', '=COUNTIF(' + B + 'K2:K,"NOT PAID")'],
    ['', ''],
    ['Last refreshed',  Utilities.formatDate(new Date(), 'Asia/Kolkata', 'd MMM, h:mm a')]
  ];

  s.getRange(1, 1, rows.length, 2).setValues(rows);
  s.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#7c1d2b');
  s.getRange('A3:A5').setFontWeight('bold');
  s.getRange('A7:A8').setFontColor('#0b3a22');
  s.getRange('A10').setFontColor('#7c1d2b');
  s.getRange('B5').setNumberFormat('₹#,##0');
  s.getRange('B3:B5').setFontSize(12).setFontWeight('bold');
  s.getRange('A12:B12').setFontSize(9).setFontColor('#888888');
  s.setColumnWidth(1, 220);
  s.setColumnWidth(2, 130);
  s.getRange(1, 2, rows.length, 1).setHorizontalAlignment('right');
}

/**
 * Bookings are trusted by default, so there is nothing to "approve".
 * These two only handle the exceptions you find on the bank statement.
 */
function markSelectedNotPaid() { setStatusOnSelection_('NOT PAID'); }
function markSelectedBooked()  { setStatusOnSelection_('BOOKED');   }

function setStatusOnSelection_(status) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== 'Bookings') {
    SpreadsheetApp.getUi().alert('Open the Bookings tab first, then select the rows.');
    return;
  }
  var who = Session.getActiveUser().getEmail() || 'volunteer';
  var n = 0;
  sheet.getActiveRangeList().getRanges().forEach(function (r) {
    for (var i = 0; i < r.getNumRows(); i++) {
      var row = r.getRow() + i;
      if (row < 2) continue;                        // never the header
      sheet.getRange(row, 11).setValue(status);     // Status
      sheet.getRange(row, 12).setValue(who);        // Checked By
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
    ['Anil Varghese',    '9800000001', 1, 100, 'BOOKED'],
    ['Deepa Mathew',     '9800000002', 4, 100, 'BOOKED'],
    ['Jacob Thomas',     '9800000003', 2, 500, 'BOOKED'],
    ['Leena Kurian',     '9800000004', 6, 100, 'BOOKED'],
    ['Sunil Zachariah',  '9800000005', 1, 500, 'BOOKED'],
    ['Maria Philip',     '9800000006', 3, 100, 'BOOKED'],
    ['Thomas Koshy',     '9800000007', 2, 100, 'BOOKED'],
    ['Rebecca Samuel',   '9800000008', 5, 100, 'NOT PAID'],  // must never win
    ['George Abraham',   '9800000009', 1, 100, 'NOT PAID']   // must never win
  ];
  people.forEach(function (p, i) {
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
      'TEST-' + (i + 1), p[0], "'" + p[1], '',
      p[2], p[3], p[2] * p[3],
      'TESTUTR' + (i + 1), '', p[4], '', 'TEST'
    ]);
  });
  console.log('Seeded ' + people.length + ' test bookings ' +
              '(7 BOOKED = 19 entries, 2 flagged NOT PAID = 6 tickets excluded).');
}

function clearTestBookings() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var notes = sheet.getRange(2, 13, last - 1, 1).getValues();   // Notes column
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
 * Everyone is eligible except rows you have flagged NOT PAID. The result
 * is written to a "Draw" sheet with the entry count and a timestamp, so
 * the draw is auditable afterwards.
 */
function drawWinner() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) { console.log('No bookings yet.'); return; }

  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var entries = [], skipped = 0;

  // Everyone is in, except rows you have flagged NOT PAID.
  rows.forEach(function (r) {
    var tickets = Number(r[5]) || 0;                       // Tickets
    var status  = String(r[10]).trim().toUpperCase();      // Status
    if (status === 'NOT PAID' || tickets < 1) { skipped++; return; }
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
              '  — from ' + entries.length + ' entries, ' + skipped + ' booking(s) excluded (NOT PAID).');
}

/**
 * Optional: totals for reconciliation.
 * Run from the editor and read the log.
 */
function reportTotals() {
  var sheet = getSheet_(), last = sheet.getLastRow();
  if (last < 2) return console.log('No bookings yet.');
  var rows = sheet.getRange(2, 6, last - 1, 6).getValues(); // Tickets .. Status
  var t = 0, amt = 0, flagged = 0;
  rows.forEach(function (r) {
    if (String(r[5]).trim().toUpperCase() === 'NOT PAID') { flagged++; return; }
    t += Number(r[0]) || 0;
    amt += Number(r[2]) || 0;
  });
  console.log('Bookings: ' + rows.length + ' | Tickets: ' + t +
              ' | Total: Rs ' + amt + ' | Flagged NOT PAID: ' + flagged);
}
