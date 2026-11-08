/**
 * @file stock.ts
 * @description Shape of a row from GET /protected/stocks, plus small display
 * helpers shared by Stocks, Stock Alert and the manager dashboard.
 */

export type StockLevel = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  minLevel: number;
  /** quantity <= minLevel (worked out by the server) */
  isLow: boolean;
};

/** Normalises one row from GET /protected/stocks (numbers can arrive as strings). */
export function toStockLevel(row: any): StockLevel {
  const quantity = Number(row?.quantity) || 0;
  const minLevel = Number(row?.minLevel) || 0;
  return {
    id: Number(row?.id),
    name: String(row?.name ?? ''),
    unit: String(row?.unit ?? ''),
    quantity,
    minLevel,
    isLow: typeof row?.isLow === 'boolean' ? row.isLow : quantity <= minLevel,
  };
}

/** 8 -> "8", 1.5 -> "1.5", 2.25 -> "2.25" (no long float tails). */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

/** "8 pcs", "1.5 L" */
export function formatQty(value: number, unit: string): string {
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
}

/** "Liempo", "Liempo and Atsara", "Liempo, Atsara and Sarsa (Gravy)" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
