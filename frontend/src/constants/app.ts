/**
 * @file app.ts
 * @description App-wide constants shared by several screens.
 */

/** Pre-filled password for new staff (must match DEFAULT_STAFF_PASSWORDS in backend/.env). */
export const DEFAULT_STAFF_PASSWORD = 'Mr.liempo123';

/** Passwords the app treats as "default" — users must change them on first login. */
export const DEFAULT_PASSWORDS = ['Mr.liempo123', 'Mr-liempo123', 'password123'];

/** Minimum password length (matches the backend). */
export const MIN_PASSWORD_LENGTH = 6;

/** Today's date as MM/DD/YYYY (the format the backend expects). */
export const todaySlashDate = (): string => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

/** RFC4122 v4 id used as an idempotency key so a double-tap can't create two orders. */
export const newRequestId = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
