/**
 * @file appState.ts
 * @description Tiny global store for the logged-in user's role, shared by the
 * screens and the side menu. (Kept outside app/ because files inside app/ are
 * treated as screens by Expo Router.)
 */

export type UserRole = 'cashier' | 'manager';

let userRole: UserRole = 'cashier';
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

/** Role of the logged-in user. */
export const getUserRole = (): UserRole => userRole;

/** Stores the logged-in user's role (call after login / when the account loads). */
export const setGlobalUserRole = (role: string | null | undefined): void => {
  userRole = String(role).toLowerCase() === 'manager' ? 'manager' : 'cashier';
  notify();
};

/** Clears session state on logout. */
export const resetAppState = (): void => {
  userRole = 'cashier';
  notify();
};

// Set when a sale is saved, so the Point-of-Sale screen starts the next order
// with an empty cart (even when the cashier goes back to it).
let saleCompleted = false;

/** Call after a sale is saved. */
export const markSaleCompleted = (): void => {
  saleCompleted = true;
};

/** True once after a sale was saved (then resets). */
export const takeSaleCompleted = (): boolean => {
  const done = saleCompleted;
  saleCompleted = false;
  return done;
};

/**
 * Subscribe to role changes. Returns an unsubscribe function that is safe to
 * return directly from useEffect.
 */
export const subscribeAppTheme = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

// TEST: setGlobalUserRole('Manager') -> getUserRole() === 'manager'
// TEST: unsubscribe stops further notifications
// TEST: markSaleCompleted() -> takeSaleCompleted() === true, then false
