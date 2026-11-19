/**
 * @file useStockItems.ts
 * @description Loads the stock item list from the backend for the Restock and
 * Record Waste dropdowns (these used to be hard-coded menu names, which the
 * backend could not match to stock items). The list (and each item's count)
 * refreshes every 15 seconds while the screen is open.
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { showAlert } from '@/utils/alert';

export type StockOption = { id: number; name: string; unit: string; quantity: number };

export function useStockItems() {
  const [stockItems, setStockItems] = useState<StockOption[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);

  /** silent = automatic refresh: no spinner (the list stays usable) and no error pop-up. */
  const reload = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoadingStocks(true);
    try {
      const token = await getToken();
      const res = await api.get(API_ROUTES.STOCKS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStockItems(res.data?.stocks || []);
    } catch (err: any) {
      if (!silent) showAlert('Error', err.response?.data?.message || 'Could not load stock items.');
    } finally {
      if (!silent) setLoadingStocks(false);
    }
  }, []);

  // Reload whenever the screen using this is shown (stock changes after sales).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Keep the counts current while Restock / Record Waste stays open.
  useAutoRefresh(() => reload({ silent: true }));

  /** Names for the dropdown. */
  const stockNames = stockItems.map((s) => s.name);

  /** Stock_ID for a selected name (undefined if not found). */
  const stockIdFor = (name: string) => stockItems.find((s) => s.name === name)?.id;

  return { stockItems, stockNames, stockIdFor, loadingStocks, reload };
}
