/**
 * @file alert.ts
 * @description Cross-platform replacement for Alert.alert.
 * React Native Web's Alert.alert does nothing, so on web screens that relied
 * on an alert button (e.g. "OK" -> go back) got stuck. On native this simply
 * calls Alert.alert; on web it uses window.alert / window.confirm.
 */
import { Alert, Platform, type AlertButton } from 'react-native';

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const actionButtons = (buttons ?? []).filter((b) => b.style !== 'cancel');
  const cancelButton = (buttons ?? []).find((b) => b.style === 'cancel');

  if (cancelButton && actionButtons.length > 0) {
    // Two-choice alert -> confirm dialog
    if (window.confirm(text)) actionButtons[0].onPress?.();
    else cancelButton.onPress?.();
    return;
  }

  window.alert(text);
  actionButtons[0]?.onPress?.();
}
