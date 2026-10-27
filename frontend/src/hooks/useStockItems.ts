/**
 * @file useStockItems.ts
 * @description Loads the stock item list from the backend for the Restock and
 * Record Waste dropdowns (these used to be hard-coded menu names, which the
 * backend could not match to stock items).
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { PROTECTED_ENDPOINTS } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { showAlert } from '@/utils/alert';

export type StockOption = { id: number; name: string; unit: string; quantity: number };

export function useStockItems() {
  const [stockItems, setStockItems] = useState<StockOption[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);

  const reload = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const token = await getToken();
      const res = await axios.get(PROTECTED_ENDPOINTS.STOCKS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStockItems(res.data?.stocks || []);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Could not load stock items.');
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Names for the dropdown. */
  const stockNames = stockItems.map((s) => s.name);

  /** Stock_ID for a selected name (undefined if not found). */
  const stockIdFor = (name: string) => stockItems.find((s) => s.name === name)?.id;

  return { stockItems, stockNames, stockIdFor, loadingStocks, reload };
}
