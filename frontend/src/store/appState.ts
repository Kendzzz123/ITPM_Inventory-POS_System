/**
 * @file appState.ts
 * @description Tiny global store for the logged-in role and the cashier dark-mode
 * toggle. (Moved out of app/(login_module)/Role.tsx — files inside app/ are
 * treated as screens by Expo Router.)
 */

export type UserRole = 'cashier' | 'manager';

let darkMode = false;
let userRole: UserRole = 'cashier';
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

/** Current dark-mode flag (cashier screens only). */
export const getDarkMode = (): boolean => darkMode;

/** Turns dark mode on/off and re-renders subscribed screens. */
export const setGlobalDarkMode = (value: boolean): void => {
  darkMode = value;
  notify();
};

/** Role of the logged-in user. */
export const getUserRole = (): UserRole => userRole;

/** Stores the logged-in user's role (call after login / when the account loads). */
export const setGlobalUserRole = (role: string | null | undefined): void => {
  userRole = String(role).toLowerCase() === 'manager' ? 'manager' : 'cashier';
  notify();
};

/** Clears session state on logout. */
export const resetAppState = (): void => {
  darkMode = false;
  userRole = 'cashier';
  notify();
};

/**
 * Subscribe to role / dark-mode changes. Returns an unsubscribe function
 * that is safe to return directly from useEffect.
 */
export const subscribeAppTheme = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

// TEST: setGlobalUserRole('Manager') -> getUserRole() === 'manager'
// TEST: unsubscribe stops further notifications
