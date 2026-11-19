/**
 * @file useAutoRefresh.ts
 * @description Calls a screen's refresh function every 15 seconds while the screen
 * is open and the app is in the foreground, so changes made on another device
 * (a manager's restock or waste, another cashier's sale) show up without leaving
 * the screen. Stops when the screen is left or the app goes to the background,
 * and refreshes at once when the app comes back to the foreground.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** How often open screens check the server for new stock (same as Stock Alert). */
export const AUTO_REFRESH_MS = 15000;

/**
 * @param refresh  The screen's own load function. It should load quietly
 *                 (no spinner, no error pop-up) so the screen doesn't flicker.
 * @param intervalMs  How often to refresh; defaults to AUTO_REFRESH_MS.
 */
export function useAutoRefresh(refresh: () => unknown, intervalMs: number = AUTO_REFRESH_MS) {
  // Always call the latest refresh function without restarting the timer.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      let running = false;
      const tick = async () => {
        // Skip while the app is in the background or the last refresh is still running.
        if (running || AppState.currentState !== 'active') return;
        running = true;
        try {
          await refreshRef.current();
        } catch {
          // The screen keeps showing its last data; the next tick tries again.
        } finally {
          running = false;
        }
      };
      const timer = setInterval(tick, intervalMs);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') tick();
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [intervalMs])
  );
}

// TEST: on the POS, a manager restocks Liempo on another phone -> within 15 s the badge changes from "Out of stock" to "10 left"; the cart is unchanged
// TEST: leaving the screen stops the timer (no requests in the network log); returning to the app refreshes at once
