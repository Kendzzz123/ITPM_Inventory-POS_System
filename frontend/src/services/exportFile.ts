/**
 * @file exportFile.ts
 * @description Saves an exported Excel file where the user can actually find it.
 *  - Android: the user picks a folder once (e.g. "Download"); the file is written
 *    there and the folder is remembered for next time.
 *  - iOS: Apple doesn't allow writing straight into a public folder, so the share
 *    sheet opens and the user taps "Save to Files".
 * A copy is always kept in the app cache so "Open File" / "Share" work afterwards.
 */
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLSX_UTI = 'org.openxmlformats.spreadsheetml.sheet';
const SAVE_DIR_KEY = 'export_save_dir_uri';

export type SaveResult = {
  /** file:// copy in the app cache, used by "Open File" / "Share". */
  shareUri: string;
  /** Message for the "Export Complete" screen. */
  message: string;
  /** True when the file was written to a folder the user can open (Android). */
  savedToFolder: boolean;
};

/** "content://.../tree/primary%3ADownload" -> "Download" */
function folderLabel(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const last = decoded.split(/[/:]/).filter(Boolean).pop();
  return last || 'the selected folder';
}

/** Writes base64 content into a new file inside `dir`. */
async function writeInto(dir: Directory, filename: string, base64: string): Promise<void> {
  const target = dir.createFile(filename, XLSX_MIME);
  await target.write(base64, { encoding: 'base64' });
}

/** Opens the share sheet for a file (also how iOS users "Save to Files"). */
export async function shareFile(uri: string, dialogTitle = 'Save or share file'): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle, UTI: XLSX_UTI });
}

/**
 * Saves an .xlsx (given as base64) to the phone. See file header for behaviour.
 * @throws when the file cannot be written at all
 */
export async function saveExcelToDevice(base64: string, filename: string): Promise<SaveResult> {
  // 1. Always keep a cache copy (for Open / Share).
  const cacheFile = new File(Paths.cache, filename);
  cacheFile.create({ overwrite: true });
  await cacheFile.write(base64, { encoding: 'base64' });

  if (Platform.OS === 'android') {
    // 2a. Re-use the folder picked last time (Android keeps the permission).
    const savedUri = await SecureStore.getItemAsync(SAVE_DIR_KEY).catch(() => null);
    if (savedUri) {
      try {
        await writeInto(new Directory(savedUri), filename, base64);
        return {
          shareUri: cacheFile.uri,
          message: `Saved to your ${folderLabel(savedUri)} folder.`,
          savedToFolder: true,
        };
      } catch {
        // Permission was removed or the folder is gone: ask again below.
        await SecureStore.deleteItemAsync(SAVE_DIR_KEY).catch(() => {});
      }
    }

    // 2b. Ask the user where to save (choose "Download" for the usual place).
    try {
      const dir = await Directory.pickDirectoryAsync();
      await writeInto(dir, filename, base64);
      await SecureStore.setItemAsync(SAVE_DIR_KEY, dir.uri).catch(() => {});
      return {
        shareUri: cacheFile.uri,
        message: `Saved to your ${folderLabel(dir.uri)} folder.`,
        savedToFolder: true,
      };
    } catch {
      return {
        shareUri: cacheFile.uri,
        message: 'No folder was chosen. Tap "Share" to save or send the file.',
        savedToFolder: false,
      };
    }
  }

  // 3. iOS: hand the file to the share sheet -> "Save to Files".
  try {
    await shareFile(cacheFile.uri, 'Save Transactions');
  } catch {
    // User closed the sheet; they can still use the buttons on the next screen.
  }
  return {
    shareUri: cacheFile.uri,
    message: 'Choose "Save to Files" in the share menu to keep it on your iPhone.',
    savedToFolder: false,
  };
}

/** Forget the remembered Android folder (next export asks again). */
export async function resetSaveFolder(): Promise<void> {
  await SecureStore.deleteItemAsync(SAVE_DIR_KEY).catch(() => {});
}
