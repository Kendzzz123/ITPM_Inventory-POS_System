/**
 * @file authService.ts
 * @description Authentication service handling token storage and retrieval.
 * Uses expo-secure-store for native platforms and localStorage for web.
 * Provides a centralized auth header builder for API requests.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { resetAppState, setGlobalUserRole } from '@/store/appState';

/** Storage key for the JWT token */
const TOKEN_KEY = 'auth_token';

/**
 * Saves the JWT token securely.
 * Uses SecureStore on native, localStorage on web.
 * @param token - The JWT token string to persist
 * 
 * @example
 * await saveToken(response.data.token);
 */
export async function saveToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('[AuthService] Failed to save token:', error);
    throw new Error('Failed to save authentication token');
  }
}

/**
 * Retrieves the stored JWT token.
 * @returns The token string, or null if not found
 * 
 * @example
 * const token = await getToken();
 * if (!token) router.replace('/');
 */
export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('[AuthService] Failed to retrieve token:', error);
    return null;
  }
}

/**
 * Removes the stored JWT token (logout).
 * 
 * @example
 * await clearToken();
 * router.replace('/');
 */
export async function clearToken(): Promise<void> {
  resetAppState();
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('[AuthService] Failed to clear token:', error);
  }
}

/**
 * Builds an Authorization header object for axios requests.
 * Returns null if no token is stored.
 * @returns Headers object with Bearer token, or null
 * 
 * @example
 * const headers = await getAuthHeaders();
 * if (!headers) { redirectToLogin(); return; }
 * axios.get(url, { headers });
 */
export async function getAuthHeaders(): Promise<{ Authorization: string } | null> {
  const token = await getToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

/**
 * Reads the role stored inside the saved JWT (no network call) and puts it in
 * the app store. Called on app start so the side menu shows the right items
 * after a reload, not just right after login.
 * @returns the role, or null when there is no valid token
 */
export async function restoreRoleFromToken(): Promise<string | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const data = JSON.parse(atob(padded)) as { role?: string; exp?: number };
    if (data.exp && data.exp * 1000 < Date.now()) return null;
    if (data.role) setGlobalUserRole(data.role);
    return data.role ?? null;
  } catch {
    return null;
  }
}

// TEST: saveToken stores and getToken retrieves the same value
// TEST: clearToken removes stored token (getToken returns null after)
// TEST: getAuthHeaders returns null when no token exists
// TEST: getAuthHeaders returns correct Bearer format
