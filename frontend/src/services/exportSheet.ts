/**
 * @file exportSheet.ts
 * @description Builds the Transaction History Excel file. Two sheets:
 *   "By Month"  — one section per month (newest first): the month name, the
 *                 column headers, that month's sales and a month total, then a
 *                 grand total when there is more than one month.
 *   "All Sales" — every sale in one table with filter dropdowns on the header.
 *                 (Excel allows only one filter per sheet, so the month
 *                 sections can't each have their own; this sheet keeps them.)
 * Both have a title block, the filter and generated date, sized columns and
 * peso currency formatting.
 *
 * Note: the free SheetJS build (which is what runs on the phone) can set layout
 * and number formats but cannot colour or bold header cells, nor set the page
 * orientation. So after building the file we open it (it's a zip), write the
 * "portrait" page setup into the sheet XML, and zip it back up — that's what the
 * fflate import is for. The look is kept professional through structure and
 * formatting rather than cell styling.
 */
import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64 encode for a byte array (works on Hermes, no Buffer/btoa). */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

const PAGE_SETUP = '<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0"/>';
const FIT_TO_PAGE = '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';

/**
 * Rewrites the workbook so every sheet prints as ONE portrait page wide.
 * Returns base64. If anything unexpected happens, falls back to the plain
 * file (still valid, just without the forced orientation) so export never fails.
 */
function toPortraitBase64(wb: XLSX.WorkBook): string {
  try {
    const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    const files = unzipSync(bytes);
    const keys = Object.keys(files).filter((k) => /worksheets\/sheet\d+\.xml$/.test(k));
    if (keys.length === 0) return bytesToBase64(bytes);

    for (const key of keys) {
      let xml = strFromU8(files[key]);
      if (!/<sheetPr[ >]/.test(xml)) {
        xml = xml.replace(/(<worksheet\b[^>]*>)/, `$1${FIT_TO_PAGE}`);
      }
      if (/<pageMargins\b[^>]*\/>/.test(xml)) {
        xml = xml.replace(/(<pageMargins\b[^>]*\/>)/, `$1${PAGE_SETUP}`);
      } else {
        xml = xml.replace('</worksheet>', `${PAGE_SETUP}</worksheet>`);
      }
      files[key] = strToU8(xml);
    }
    return bytesToBase64(zipSync(files));
  } catch {
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  }
}

export type ExportRow = {
  date: string;
  time: string;
  product: string;
  amount: number;
  method: string;
};

export type ExportMeta = {
  /** e.g. "This Month", "10/01/2026 to 10/28/2026", or "All dates". */
  dateLabel: string;
  /** e.g. "Cash" or "All payment methods". */
  methodLabel: string;
};

const PESO_FORMAT = '"₱"#,##0.00'; // ₱1,234.50
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "October 28, 2026 at 7:25 PM" */
function formatNow(): string {
  const d = new Date();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${h}:${m} ${ampm}`;
}

type Cell = string | number;

const HEADER: Cell[] = ['Date', 'Time', 'Product', 'Payment Method', 'Total Amount'];
const AMOUNT_COL = 4;

/** One sale as a sheet row: Date, Time, Product, Payment Method, Total Amount. */
function toCells(r: ExportRow): Cell[] {
  return [
    r.date,
    r.time,
    String(r.product || '').replace(/\s*\n\s*/g, ' ').trim(),
    r.method || 'Cash',
    Number(r.amount) || 0,
  ];
}

/** "1 sale", "12 sales" */
function salesCount(n: number): string {
  return `${n} ${n === 1 ? 'sale' : 'sales'}`;
}

/** "11/02/2026" -> { key: "2026-11", label: "November 2026" } */
function monthOf(date: string): { key: string; label: string } {
  const m = /^(\d{1,2})\/\d{1,2}\/(\d{4})$/.exec(String(date || '').trim());
  if (!m) return { key: 'other', label: 'Other dates' };
  const month = Number(m[1]);
  const name = month >= 1 && month <= 12 ? MONTHS[month - 1] : 'Unknown month';
  return { key: `${m[2]}-${String(month).padStart(2, '0')}`, label: `${name} ${m[2]}` };
}

/** Title, generated time and filter: the first three rows of both sheets. */
function titleRows(meta: ExportMeta): Cell[][] {
  return [
    ['Mr. Liempo — Transaction History'],
    [`Generated: ${formatNow()}`],
    [`Filter: ${meta.dateLabel}   •   ${meta.methodLabel}`],
  ];
}

/** Widths, margins, merges and the peso format, shared by both sheets. */
function finishSheet(aoa: Cell[][], merges: XLSX.Range[], pesoRows: number[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Column widths chosen so all five columns fit on ONE portrait page.
  ws['!cols'] = [{ wch: 11 }, { wch: 8 }, { wch: 34 }, { wch: 15 }, { wch: 14 }];
  // Portrait page with narrow margins (inches) so the table fits one page width.
  ws['!margins'] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  // The three title lines span all five columns.
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    ...merges,
  ];
  for (const r of pesoRows) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: AMOUNT_COL })];
    if (cell) {
      cell.t = 'n';
      cell.z = PESO_FORMAT;
    }
  }
  return ws;
}

/**
 * "By Month": a section per month, in the order the rows come (newest first).
 * A total label sits in Product + Payment Method (merged) so it has room.
 */
function byMonthSheet(rows: ExportRow[], meta: ExportMeta): XLSX.WorkSheet {
  const sections: { key: string; label: string; rows: Cell[][] }[] = [];
  for (const r of rows) {
    const { key, label } = monthOf(r.date);
    let section = sections.find((s) => s.key === key);
    if (!section) {
      section = { key, label, rows: [] };
      sections.push(section);
    }
    section.rows.push(toCells(r));
  }

  const aoa: Cell[][] = [...titleRows(meta), []];
  const merges: XLSX.Range[] = [];
  const pesoRows: number[] = [];
  const totalLine = (label: string, amount: number) => {
    merges.push({ s: { r: aoa.length, c: 2 }, e: { r: aoa.length, c: 3 } });
    pesoRows.push(aoa.length);
    aoa.push(['', '', label, '', amount]);
  };

  if (sections.length === 0) {
    aoa.push(HEADER, ['No sales match this filter.']);
    return finishSheet(aoa, merges, pesoRows);
  }

  let grandTotal = 0;
  sections.forEach((section, i) => {
    if (i > 0) aoa.push([]);
    merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: 4 } });
    aoa.push([section.label]);
    aoa.push(HEADER);
    let monthTotal = 0;
    for (const row of section.rows) {
      pesoRows.push(aoa.length);
      aoa.push(row);
      monthTotal += Number(row[AMOUNT_COL]) || 0;
    }
    grandTotal += monthTotal;
    const count = salesCount(section.rows.length);
    totalLine(sections.length === 1 ? `TOTAL  (${count})` : `${section.label} total  (${count})`, monthTotal);
  });

  if (sections.length > 1) {
    aoa.push([]);
    totalLine(`TOTAL, all ${sections.length} months  (${salesCount(rows.length)})`, grandTotal);
  }
  return finishSheet(aoa, merges, pesoRows);
}

/** "All Sales": every sale in one table, with filter dropdowns on the header. */
function allSalesSheet(rows: ExportRow[], meta: ExportMeta): XLSX.WorkSheet {
  const dataRows = rows.map(toCells);
  const total = dataRows.reduce((sum, r) => sum + (Number(r[AMOUNT_COL]) || 0), 0);
  const aoa: Cell[][] = [
    ...titleRows(meta),
    [],
    HEADER,
    ...dataRows,
    [],
    ['', '', '', `TOTAL  (${salesCount(rows.length)})`, total],
  ];
  const headerRow = 4; // 0-based row index of the header
  const firstData = headerRow + 1;
  const pesoRows = dataRows.map((_, i) => firstData + i).concat(aoa.length - 1);
  const ws = finishSheet(aoa, [], pesoRows);
  ws['!autofilter'] = { ref: `A${headerRow + 1}:E${headerRow + 1 + Math.max(dataRows.length, 1)}` };
  return ws;
}

/**
 * Builds the workbook and returns it as a base64 string (ready to save/share).
 * @param rows transactions already filtered and ordered as they should appear
 */
export function buildTransactionsXlsxBase64(rows: ExportRow[], meta: ExportMeta): string {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, byMonthSheet(rows, meta), 'By Month');
  XLSX.utils.book_append_sheet(wb, allSalesSheet(rows, meta), 'All Sales');
  return toPortraitBase64(wb);
}

// TEST: amount cells carry the peso number format and the total row sums the rows
// TEST: three title rows are merged across columns A–E
// TEST: "By Month" has one section per month (Nov 2026 before Oct 2026), each with headers and its own total;
//       the grand total equals the sum of the month totals; one month -> no grand total line
