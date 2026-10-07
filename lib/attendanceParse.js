/**
 * Flexible attendance-sheet parser for .csv / .xlsx / .xls files.
 *
 * Handles the official Y-24 report layout as well as plain CSV exports:
 *  - Title rows above the header are skipped; the header row is the first
 *    row containing a REGD.NO / ROLL column.
 *  - Slot columns are recognised by a time range ("09:20-10:10", "4:30-5:30")
 *    in the header row or up to 3 rows above it. If no time labels exist,
 *    columns filled with P/A are used, mapped onto TIME_SLOTS when there
 *    are exactly 8 of them.
 *  - STATUS / Total Conducted / Total Attended / Att (%) columns are ignored.
 *  - The attendance date is read from a date cell above the header
 *    (e.g. "23.09.2026"), falling back to a date in the file name.
 */
import * as XLSX from 'xlsx';
import { TIME_SLOTS } from '@/lib/helpers';
import { normalizeCluster } from '@/lib/attendanceCalc';

const TIME_RE = /(\d{1,2})\s*[:.]\s*(\d{2})\s*(?:[ap]\.?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2})\s*[:.]\s*(\d{2})/i;
const DATE_RE = /(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2,4})/;
const ISO_RE  = /(\d{4})-(\d{2})-(\d{2})/;

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const pad   = n => String(n).padStart(2, '0');

/** '9:20 - 10:10' → '09:20-10:10' */
export function slotLabel(text) {
  const m = clean(text).match(TIME_RE);
  return m ? `${pad(m[1])}:${m[2]}-${pad(m[3])}:${m[4]}` : '';
}

function validISO(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? `${y}-${pad(m)}-${pad(d)}` : '';
}

/** Day-first date text ('23.09.2026', '23/09/26', '2026-09-23') → ISO or '' */
export function parseDateText(text) {
  const t = clean(text);
  let m = t.match(ISO_RE);
  if (m) return validISO(+m[1], +m[2], +m[3]);
  m = t.match(DATE_RE);
  if (!m) return '';
  const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  return validISO(y, +m[2], +m[1]);
}

const HEADER_PATTERNS = {
  roll:    [/^regd?\.?\s*no/i, /^reg(istration)?\.?\s*(no|number)/i, /roll/i, /^regd/i],
  name:    [/^(student\s*)?name$/i, /^name\s+of/i],
  branch:  [/^branch$/i],
  dept:    [/^dept\.?$/i, /^department$/i],
  cluster: [/^cluster$/i],
  crtSec:  [/crt\s*sec/i, /^sec(tion)?$/i],
  crtRoom: [/crt\s*roo/i, /^room/i],
  sno:     [/^s\.?\s*no\.?$/i, /^sl\.?\s*no\.?$/i],
};
const IGNORE_HEADER = /status|total|conducted|attended|att\s*\(?%|percent|%|remarks?/i;

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = rows[i].map(clean);
    const hasRoll = cells.some(c => HEADER_PATTERNS.roll.some(p => p.test(c)));
    const hasName = cells.some(c => HEADER_PATTERNS.name.some(p => p.test(c)));
    if (hasRoll && hasName) return i;
  }
  return -1;
}

function valueStatus(v) {
  const t = clean(v).toUpperCase();
  if (['P', 'PRESENT', 'PR'].includes(t)) return 'present';
  if (['A', 'AB', 'ABSENT', 'ABS'].includes(t)) return 'absent';
  return null;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
/** Number format like 'dd.mm.yyyy' / 'm/d/yy' (ignores quoted text and [colour] codes) */
const isDateFormat = z => !!z && /[dy]/i.test(String(z).replace(/"[^"]*"|\[[^\]]*\]/g, ''));

/** Find the attendance date in the cells above the header row */
function findSheetDate(ws, headerRow) {
  if (!ws['!ref']) return '';
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r < range.s.r + headerRow; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      // Excel date cell — decode the serial directly (no timezone shifts)
      if (cell.t === 'n' && isDateFormat(cell.z) && cell.v > 40000 && cell.v < 80000) {
        const d = new Date(EXCEL_EPOCH + Math.floor(cell.v) * 86400000);
        return validISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      }
      if (cell.t === 's') {
        // Only a cell that is *just* a date — skips "…REPORT w.e.f 19.08.2026"
        const t = clean(cell.v).replace(/^date\s*[:\-]?\s*/i, '');
        if (/^\d{1,4}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}$/.test(t)) {
          const iso = parseDateText(t);
          if (iso) return iso;
        }
      }
    }
  }
  return '';
}

/** Parse one worksheet; returns null when it has no NAME + REGD.NO header */
function parseSheet(ws, sheet) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: true });
  const headerRow = findHeaderRow(rows);
  if (headerRow < 0) return null;

  const warnings = [];
  const header = rows[headerRow].map(clean);
  const width  = Math.max(...rows.slice(headerRow).map(r => r.length));

  // Known identity columns
  const col = {};
  for (const [key, pats] of Object.entries(HEADER_PATTERNS)) {
    const idx = header.findIndex(c => c && pats.some(p => p.test(c)));
    if (idx >= 0) col[key] = idx;
  }
  const known = new Set(Object.values(col));

  const dataRows = rows.slice(headerRow + 1);

  // Slot columns: by time label in the header or the rows just above it
  let slotCols = [];
  for (let c = 0; c < width; c++) {
    if (known.has(c) || IGNORE_HEADER.test(header[c] || '')) continue;
    let label = slotLabel(header[c]);
    for (let r = headerRow - 1; !label && r >= Math.max(0, headerRow - 3); r--) label = slotLabel(rows[r][c]);
    if (label) slotCols.push({ c, slot: label });
  }

  // Fallback: columns mostly filled with P/A
  if (!slotCols.length) {
    const sample = dataRows.slice(0, 200);
    for (let c = 0; c < width; c++) {
      if (known.has(c) || IGNORE_HEADER.test(header[c] || '')) continue;
      const vals = sample.map(r => clean(r[c])).filter(Boolean);
      if (vals.length && vals.filter(v => valueStatus(v)).length / vals.length >= 0.8) slotCols.push({ c, slot: header[c] || `Col ${c + 1}` });
    }
    if (slotCols.length === TIME_SLOTS.length) {
      slotCols = slotCols.map((s, i) => ({ ...s, slot: TIME_SLOTS[i] }));
      warnings.push('No time labels found — the 8 P/A columns were mapped to the standard CRT slots in order.');
    } else if (slotCols.length) {
      warnings.push(`No time labels found — using ${slotCols.length} P/A column(s) by their header names.`);
    }
  }
  if (!slotCols.length) throw new Error(`Sheet "${sheet}": no attendance slot columns found (expected time headers like 09:20-10:10 with P/A values).`);

  const dupSlots = slotCols.map(s => s.slot).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupSlots.length) throw new Error(`Sheet "${sheet}": slot column(s) appear twice: ${[...new Set(dupSlots)].join(', ')}`);

  // Students
  const students = [];
  const seen = new Set();
  let badValues = 0, dupRolls = 0;
  for (const r of dataRows) {
    const roll = clean(r[col.roll]).toUpperCase().replace(/\.0+$/, '').replace(/\s/g, '');
    const name = clean(r[col.name]);
    if (!roll || !name || !/^[0-9A-Z]{5,15}$/.test(roll)) continue;
    if (seen.has(roll)) { dupRolls++; continue; }
    seen.add(roll);

    const marks = {};
    for (const { c, slot } of slotCols) {
      const raw = clean(r[c]);
      if (!raw) continue;
      const st = valueStatus(raw);
      if (st) marks[slot] = st; else badValues++;
    }

    students.push({
      rollNumber: roll,
      name,
      branch:  col.branch  != null ? clean(r[col.branch])  : '',
      dept:    col.dept    != null ? clean(r[col.dept])    : '',
      cluster: col.cluster != null ? normalizeCluster(clean(r[col.cluster])) : '',
      clusterRaw: col.cluster != null ? clean(r[col.cluster]) : '',
      crtSec:  col.crtSec  != null ? clean(r[col.crtSec])  : '',
      crtRoom: col.crtRoom != null ? clean(r[col.crtRoom]) : '',
      sno:     col.sno     != null ? (parseInt(r[col.sno]) || 0) : 0,
      marks,
    });
  }
  if (!students.length) return null;
  if (dupRolls)  warnings.push(`${dupRolls} duplicate REGD.NO row(s) skipped (first occurrence kept).`);
  if (badValues) warnings.push(`${badValues} cell(s) were not P or A and were left blank.`);
  if (col.cluster == null) warnings.push('No CLUSTER column — every row will be assigned the selected cluster.');
  const unknownCl = students.filter(s => s.clusterRaw && !s.cluster).length;
  if (unknownCl) warnings.push(`${unknownCl} row(s) have an unrecognised CLUSTER value (expected C1 or C2).`);

  let date = findSheetDate(ws, headerRow), dateSource = date ? 'sheet' : '';
  if (!date && (date = parseDateText(sheet))) dateSource = 'sheet name';

  return { sheet, date, dateSource, slots: slotCols.map(s => s.slot), students, warnings };
}

/**
 * Parse every attendance sheet in a file (workbooks may hold one day per sheet).
 *
 * @param {ArrayBuffer|Buffer} buffer
 * @param {string} fileName
 * @returns {{ sheets: Array<{ sheet, date, dateSource, slots, students, warnings }>, defaultSheet: string }}
 */
export function parseAttendanceFile(buffer, fileName = '') {
  const isCsv = /\.(csv|txt)$/i.test(fileName);
  const wb = isCsv
    // raw: keep every CSV cell as text so roll numbers and dates are never reinterpreted
    ? XLSX.read(Buffer.from(buffer).toString('utf8').replace(/^\uFEFF/, ''), { type: 'string', raw: true })
    : XLSX.read(buffer, { type: 'buffer', cellNF: true });

  const sheets = wb.SheetNames.map(n => parseSheet(wb.Sheets[n], n)).filter(Boolean);
  if (!sheets.length) throw new Error('Could not find a sheet with NAME and REGD.NO columns and student rows.');

  const fileDate = parseDateText(fileName.replace(/\.[a-z]+$/i, ''));
  if (sheets.length === 1 && !sheets[0].date && fileDate) {
    sheets[0].date = fileDate;
    sheets[0].dateSource = 'file name';
  }

  // Default to the sheet matching the file-name date, else the last (newest) sheet
  const defaultSheet = (sheets.find(s => fileDate && s.date === fileDate) || sheets[sheets.length - 1]).sheet;
  return { sheets, defaultSheet };
}
