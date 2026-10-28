/**
 * @file exportSheet.ts
 * @description Builds the Transaction History Excel file with a clean, readable
 * layout: a title block, the filter and generated date, sized columns, peso
 * currency formatting, a totals row, and an auto-filter on the header.
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
 * Rewrites the workbook so the sheet prints as ONE portrait page wide.
 * Returns base64. If anything unexpected happens, falls back to the plain
 * file (still valid, just without the forced orientation) so export never fails.
 */
function toPortraitBase64(wb: XLSX.WorkBook): string {
  try {
    const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    const files = unzipSync(bytes);
    const key = Object.keys(files).find((k) => /worksheets\/sheet1\.xml$/.test(k));
    if (!key) return bytesToBase64(bytes);

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

/**
 * Builds the workbook and returns it as a base64 string (ready to save/share).
 * @param rows transactions already filtered and ordered as they should appear
 */
export function buildTransactionsXlsxBase64(rows: ExportRow[], meta: ExportMeta): string {
  const header = ['Date', 'Time', 'Product', 'Payment Method', 'Total Amount'];
  const dataRows = rows.map((r) => [
    r.date,
    r.time,
    String(r.product || '').replace(/\s*\n\s*/g, ' ').trim(),
    r.method || 'Cash',
    Number(r.amount) || 0,
  ]);
  const total = dataRows.reduce((sum, r) => sum + Number(r[4] || 0), 0);
  const countLabel = `${rows.length} ${rows.length === 1 ? 'sale' : 'sales'}`;

  const aoa = [
    ['Mr. Liempo — Transaction History'],
    [`Generated: ${formatNow()}`],
    [`Filter: ${meta.dateLabel}   •   ${meta.methodLabel}`],
    [],
    header,
    ...dataRows,
    [],
    ['', '', '', `TOTAL  (${countLabel})`, total],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths chosen so all five columns fit on ONE portrait page.
  ws['!cols'] = [{ wch: 11 }, { wch: 8 }, { wch: 34 }, { wch: 15 }, { wch: 14 }];

  // Portrait page with narrow margins (inches). Excel already defaults to
  // portrait; the narrow margins keep the whole table within one page width.
  ws['!margins'] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

  // Merge the three title lines across all columns.
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
  ];

  const headerRow = 4; // 0-based row index of the header
  const firstData = headerRow + 1;
  const lastData = firstData + dataRows.length - 1;
  const totalRow = aoa.length - 1;

  // Peso currency format on the amount column (data rows + total).
  const amountRows = [...Array(dataRows.length).keys()].map((i) => firstData + i).concat(totalRow);
  for (const r of amountRows) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 4 })];
    if (cell) {
      cell.t = 'n';
      cell.z = PESO_FORMAT;
    }
  }

  // Header + data get filter dropdowns.
  ws['!autofilter'] = { ref: `A${headerRow + 1}:E${lastData + 1}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  return toPortraitBase64(wb);
}

// TEST: amount cells carry the peso number format and the total row sums the rows
// TEST: three title rows are merged across columns A–E
