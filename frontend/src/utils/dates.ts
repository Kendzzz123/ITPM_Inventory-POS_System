/**
 * @file dates.ts
 * @description Helpers for the mm/dd/yyyy date boxes (Record Waste and the
 * Transaction History filter). The backend expects the same format.
 */

/** Formats typed digits as mm/dd/yyyy while the user types ("1027" -> "10/27"). */
export function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "10/27/2026" -> that day at midnight, or null if it isn't a real calendar date. */
export function parseSlashDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [mm, dd, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

/** True for a real date in mm/dd/yyyy that is not in the future. */
export function isValidPastDate(value: string): boolean {
  const d = parseSlashDate(value);
  return d !== null && d.getTime() <= Date.now();
}

/** The date filter choices used by the history screens. */
export type DateFilterChoice = 'Today' | 'This Week' | 'This Month' | 'Custom';

/**
 * True when a row's "mm/dd/yyyy" date falls inside the chosen filter.
 * Same rules as the backend: weeks start on Monday, Custom is inclusive.
 * The screens also check rows with this, so the filter works even if the
 * backend running on the PC is an older copy that ignores the filter.
 */
export function matchesDateFilter(
  dateText: string,
  filter: DateFilterChoice,
  start = '',
  end = '',
  today: Date = new Date(),
): boolean {
  const day = parseSlashDate(dateText);
  if (!day) return true; // unknown format: keep the row rather than hide it
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (filter === 'Today') return day.getTime() === t.getTime();
  if (filter === 'This Week') {
    const monday = new Date(t);
    monday.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return day >= monday && day <= sunday;
  }
  if (filter === 'This Month') {
    return day.getFullYear() === t.getFullYear() && day.getMonth() === t.getMonth();
  }
  const from = parseSlashDate(start);
  const to = parseSlashDate(end);
  if (!from || !to) return true;
  return day >= from && day <= to;
}

// TEST: formatDateInput('10272026') === '10/27/2026'; parseSlashDate('02/30/2026') === null
// TEST: matchesDateFilter('11/09/2026', 'This Week', '', '', new Date(2026, 10, 14)) === true (Mon 11/09 - Sun 11/15); '11/08/2026' -> false
// TEST: isValidPastDate(todaySlashDate()) === true; a date next year -> false
