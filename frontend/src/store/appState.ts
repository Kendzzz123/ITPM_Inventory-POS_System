/**
 * @file appState.ts
 * @description Tiny global store for the logged-in role and the cashier dark-mode
 * toggle. (Moved out of app/(login_module)/Role.tsx — files inside app/ are
 * treated as screens by Expo Router.)
 *
 * Dark mode is remembered PER USER on this phone: once a user turns it on it
 * stays on after closing the app or logging out/in, until that user turns it off.
 */
import { getStoredItem, setStoredItem } from '@/services/storage';

export type UserRole = 'cashier' | 'manager';

let darkMode = false;
let userRole: UserRole = 'cashier';
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

/** Storage key for one user's dark-mode setting. */
const darkModeKey = (userId: string) => `dark_mode_user_${userId}`;

/** Current dark-mode flag (cashier screens only). */
export const getDarkMode = (): boolean => darkMode;

/** Turns dark mode on/off and re-renders subscribed screens. */
export const setGlobalDarkMode = (value: boolean): void => {
  darkMode = value;
  notify();
  if (currentUserId) {
    setStoredItem(darkModeKey(currentUserId), value ? '1' : '0');
  }
};

/**
 * Sets the logged-in user and loads THEIR saved dark-mode setting.
 * Await it before showing the home screen so it opens in the right theme.
 */
export const setCurrentUser = async (userId: string | number | null | undefined): Promise<void> => {
  currentUserId = userId === null || userId === undefined ? null : String(userId);
  darkMode = currentUserId ? (await getStoredItem(darkModeKey(currentUserId))) === '1' : false;
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
  // The user's saved dark-mode setting stays in storage for their next login.
  darkMode = false;
  userRole = 'cashier';
  currentUserId = null;
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
// TEST: setCurrentUser(5) after user 5 enabled dark mode -> getDarkMode() === true
// TEST: user 6 on the same phone still starts in light mode
