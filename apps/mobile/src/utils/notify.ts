import { Alert, Platform } from 'react-native';

/**
 * react-native-web doesn't implement `Alert.alert` (it's a silent no-op),
 * so any screen that relies on it for feedback — success or error — looks
 * broken on web: buttons appear to do nothing. This dispatches to
 * `window.alert` there instead, and to the real `Alert.alert` everywhere else.
 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
