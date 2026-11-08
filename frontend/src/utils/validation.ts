/**
 * @file validation.ts
 * @description Guard clauses for the staff and password forms. Each function
 * returns an error message to show, or null when the value is OK.
 * The backend runs the same rules (backend/src/utils/helpers.js and
 * assertPasswordLength in auth.routes.js), so a bad value is refused either way.
 */
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '@/constants/app';

/** Characters a name may use: letters (incl. ñ, é, ...), digits, space, period, apostrophe, hyphen. */
const NAME_CHARS = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'-]+$/;
const STARTS_WITH_LETTER = /^[A-Za-zÀ-ÖØ-öø-ÿ]/;
/** A number inside a name must be its own word: "8" or "8." (as in "Jennifer 8. Lee"). */
const NUMBER_WORD = /^\d+\.?$/;

/**
 * Name: required. Letters, spaces and . ' - are fine ("Juan Dela Cruz", "Ma. Peña").
 * A number is allowed only as its own part of the name ("Jennifer 8. Lee");
 * "Juan2" and "12345" are refused.
 */
export function nameError(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Please enter a name.';
  if (!NAME_CHARS.test(value)) {
    return "Name can only contain letters, numbers, spaces, periods (.), apostrophes (') and hyphens (-).";
  }
  if (!STARTS_WITH_LETTER.test(value)) return 'Name must start with a letter.';
  const mixedWord = value.split(/\s+/).find((word) => /\d/.test(word) && !NUMBER_WORD.test(word));
  if (mixedWord) {
    return `A number in a name must be on its own, like "Jennifer 8. Lee" ("${mixedWord}" mixes letters and numbers).`;
  }
  if (value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length < 2) return 'Name must have at least 2 letters.';
  if (value.length > 100) return 'Name must be at most 100 characters.';
  return null;
}

/**
 * Contact number (Philippines), in one of two forms:
 *   09XXXXXXXXX   — 11 digits, starts with 09       (e.g. 09171234567)
 *   +639XXXXXXXXX — 13 characters, starts with +639 (e.g. +639171234567)
 * No spaces or dashes. Empty = not given (the field is optional).
 */
export function phoneError(phone: string): string | null {
  const value = phone.trim();
  if (!value) return null;
  if (/[^\d+]/.test(value)) {
    return 'Contact number can only contain digits and a + at the start (no spaces or dashes).';
  }
  if (value.lastIndexOf('+') > 0) return '"+" can only be at the start of the number (e.g. +639171234567).';
  if (value.startsWith('+')) {
    if (!value.startsWith('+639')) return 'A number with + must start with +639 (e.g. +639171234567).';
    if (value.length !== 13) {
      return `A +63 number must be 13 characters (you entered ${value.length}), e.g. +639171234567.`;
    }
    return null;
  }
  if (!value.startsWith('09')) {
    return 'Contact number must start with 09 or +639 (e.g. 09171234567 or +639171234567).';
  }
  if (value.length !== 11) {
    return `A 09 number must be exactly 11 digits (you entered ${value.length}), e.g. 09171234567.`;
  }
  return null;
}

/** Email: must look like name@domain.com. Empty = not given (the field is optional). */
export function emailError(email: string): string | null {
  const value = email.trim();
  if (!value) return null;
  if (/\s/.test(value)) return 'Email cannot contain spaces.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'Please enter a valid email address (e.g. name@gmail.com).';
  }
  if (value.length > 150) return 'Email must be at most 150 characters.';
  return null;
}

/** Password: 6 to 72 characters (72 is the most bcrypt can use). */
export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

// TEST: nameError('Juan Dela Cruz') === null; nameError('Jennifer 8. Lee') === null; nameError('Juan2') and nameError('12345') -> error
// TEST: phoneError('09171234567') === null; phoneError('+639171234567') === null; phoneError('0917123456') -> 11 digits; phoneError('+63917123456') -> 13 characters
// TEST: emailError('a@b.co') === null; emailError('a@b') -> invalid
// TEST: passwordError('12345') -> at least 6; passwordError('x'.repeat(73)) -> at most 72
