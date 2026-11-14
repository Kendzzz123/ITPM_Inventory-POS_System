/**
 * @file inventory.ts
 * @description The Inventory list: one card per POS menu item, in menu order.
 * Used by the Inventory screen, the item detail page and Stock Alert.
 *
 * - An item with its own stock (Whole Juicy Chicken, Liempo, Atsara, ...) shows
 *   that stock's count, and is low when the stock is at or below its minimum.
 * - An item that uses another item's stock (Half Juicy Chicken uses 0.5 of a
 *   Whole) shows how many can still be sold from that stock, and is low when
 *   that stock is low. Restocking it means restocking the stock it uses.
 */
import { api, API_ROUTES } from '@/config/apiConfig';
import { imageFor } from '@/constants/images';
import { toStockLevel, type StockLevel } from '@/utils/stock';

export type InventoryCard = {
  /** Menu item name, e.g. "Half Juicy Chicken". Also the card's key. */
  name: string;
  /** Stock count, or (for an item without its own stock) how many can be sold. */
  quantity: number;
  /** "pcs", "packs", "L", or "" for an item without its own stock. */
  unit: string;
  isLow: boolean;
  /** The stock to restock for this card (its own, or the one it uses). */
  stockId: number | null;
  /** Set when the item uses another item's stock: that stock's name. */
  usesStockOf: string | null;
  /** How much of that stock one order uses (0.5 for Half Juicy Chicken). */
  portion: number | null;
  image: string;
};

type MenuPortion = { stockId: number; stockName: string; quantityUsed: number };
type MenuRow = { name: string; portions?: MenuPortion[]; available?: number | null };

/** Builds the cards from the two API answers (menu may be null if it failed). */
export function buildInventory(stocks: StockLevel[], menu: MenuRow[] | null): InventoryCard[] {
  const fromStock = (s: StockLevel, name = s.name): InventoryCard => ({
    name,
    quantity: s.quantity,
    unit: s.unit,
    isLow: s.isLow,
    stockId: s.id,
    usesStockOf: null,
    portion: null,
    image: imageFor(name),
  });

  if (!menu) return stocks.map((s) => fromStock(s));

  const cards: InventoryCard[] = [];
  const used = new Set<number>();
  for (const item of menu) {
    const own = stocks.find((s) => s.name === item.name);
    if (own) {
      cards.push(fromStock(own));
      used.add(own.id);
      continue;
    }
    const portions = item.portions ?? [];
    if (portions.length === 0) continue; // not tracked in stock
    const first = portions[0];
    cards.push({
      name: item.name,
      quantity: Math.max(0, Number(item.available) || 0),
      unit: '',
      isLow: portions.some((p) => stocks.find((s) => s.id === p.stockId)?.isLow),
      stockId: first.stockId,
      usesStockOf: first.stockName,
      portion: Number(first.quantityUsed) || null,
      image: imageFor(item.name),
    });
  }
  // Any visible stock without a menu item of its own name still gets a card.
  for (const s of stocks) if (!used.has(s.id)) cards.push(fromStock(s));
  return cards;
}

/**
 * Loads the Inventory cards. If the menu can't be loaded, falls back to the
 * stock list alone (the screen still works, without Half Juicy Chicken).
 * Throws if the stock list itself can't be loaded.
 */
export async function fetchInventory(token: string): Promise<InventoryCard[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const [stockRes, menuRes] = await Promise.all([
    api.get(API_ROUTES.STOCKS, { headers }),
    api.get(API_ROUTES.MENU_ITEMS, { headers }).catch(() => null),
  ]);
  const stocks = ((stockRes.data?.stocks || []) as unknown[]).map(toStockLevel);
  const menu = menuRes ? ((menuRes.data?.items || []) as MenuRow[]) : null;
  return buildInventory(stocks, menu);
}

/** "10 remaining", "1.5 L remaining" (pieces and packs need no unit). */
export function remainingLabel(card: InventoryCard, format: (n: number) => string): string {
  const showUnit = card.unit && card.unit !== 'pcs' && card.unit !== 'packs';
  return `${format(card.quantity)}${showUnit ? ` ${card.unit}` : ''} remaining`;
}

// TEST: buildInventory with Whole 10 (min 10) and Half using 0.5 -> Half card quantity 20, isLow true, stockId = Whole's id
// TEST: buildInventory(stocks, null) returns one card per stock (menu failed)
