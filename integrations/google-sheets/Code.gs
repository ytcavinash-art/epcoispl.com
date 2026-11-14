// Paste into the Apps Script project opened from your EPCO enquiry spreadsheet.
// Set SHEET_ID in Script Properties, or use the personalised local copy provided.
const DEFAULT_SHEET_ID = '';
const TAB_NAME = 'Enquiries';
const HEADERS = ['Date & Time', 'Reference No.', 'Name', 'Email', 'Phone', 'Service', 'Project Details', 'Privacy Consent'];

function setupEnquirySheet() {
  const properties = PropertiesService.getScriptProperties();
  const sheetId = properties.getProperty('SHEET_ID') || DEFAULT_SHEET_ID;
  if (!sheetId) throw new Error('Set SHEET_ID in Project Settings > Script Properties first.');
  const book = SpreadsheetApp.openById(sheetId);
  const sheet = book.getSheetByName(TAB_NAME) || book.insertSheet(TAB_NAME);
  initialiseSheet_(sheet);
  properties.setProperty('SHEET_ID', sheetId);
  if (!properties.getProperty('WEBHOOK_SECRET')) properties.setProperty('WEBHOOK_SECRET', (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''));
  sheet.setFrozenRows(1);
  sheet.getRange('A:H').setNumberFormat('@');
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#173e54').setFontColor('#ffffff').setWrap(true);
  [175, 320, 180, 240, 160, 240, 420, 150].forEach(function(width, index) { sheet.setColumnWidth(index + 1, width); });
  // Copy WEBHOOK_SECRET from Script Properties directly into Cloudflare Secrets.
  // Never publish the secret or send it in chat.
}
function initialiseSheet_(sheet) {
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  else {
    const actual = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (!HEADERS.every(function(value, index) { return actual[index] === value; })) throw new Error('The Enquiries tab has different headers. Existing data was not changed.');
  }
}
function doGet() { return json_({ ok: true, service: 'EPCO enquiry receiver', method: 'POST' }); }
function doPost(e) {
  let input;
  try { input = JSON.parse(e && e.postData ? e.postData.contents : ''); }
  catch (error) { return json_({ ok: false, error: 'Invalid request.' }); }
  const properties = PropertiesService.getScriptProperties();
  const secret = properties.getProperty('WEBHOOK_SECRET');
  if (!secret || !input || typeof input !== 'object' || !equalSecret_(String(input.secret || ''), secret)) return json_({ ok: false, error: 'Not authorised.' });
  const data = {};
  const limits = { name: 100, email: 120, phone: 30, service: 100, message: 1200 };
  for (const key in limits) {
    if (typeof input[key] !== 'string') return json_({ ok: false, error: 'Invalid enquiry.' });
    data[key] = input[key].trim();
    if (data[key].length > limits[key] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data[key])) return json_({ ok: false, error: 'Invalid enquiry.' });
  }
  const reference = String(input.reference || '');
  const timestamp = input.createdAt ? new Date(input.createdAt) : new Date();
  if (!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !/^[a-f0-9-]{36}$/i.test(reference) || input.consent !== true || isNaN(timestamp.getTime())) return json_({ ok: false, error: 'Invalid enquiry.' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return json_({ ok: false, error: 'Receiver busy. Retry with the same reference.' });
  try {
    const sheetId = properties.getProperty('SHEET_ID');
    if (!sheetId) throw new Error('Receiver is not configured.');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(TAB_NAME);
    if (!sheet) throw new Error('Run setupEnquirySheet first.');
    initialiseSheet_(sheet);
    if (sheet.getLastRow() > 1) {
      const found = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(reference).matchEntireCell(true).findNext();
      if (found) return json_({ ok: true, reference: reference, duplicate: true });
    }
    sheet.appendRow([Utilities.formatDate(timestamp, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'), reference, asSheetText_(data.name), asSheetText_(data.email), asSheetText_(data.phone), asSheetText_(data.service), asSheetText_(data.message), 'Yes']);
    SpreadsheetApp.flush();
    return json_({ ok: true, reference: reference });
  } catch (error) {
    console.error('EPCO sheet receiver could not save the enquiry.');
    return json_({ ok: false, error: 'Unable to save enquiry.' });
  } finally { lock.releaseLock(); }
}
function asSheetText_(value) { return /^\s*[=+\-@]/.test(value) ? "'" + value : value; }
function equalSecret_(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
