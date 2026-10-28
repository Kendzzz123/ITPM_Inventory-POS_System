/**
 * @file storage.ts
 * @description Small key/value storage that survives app restarts.
 * SecureStore on iOS/Android, localStorage on web. Errors never crash the app.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function getStoredItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') localStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Not critical (e.g. private browsing) — the setting just won't be remembered.
  }
}
