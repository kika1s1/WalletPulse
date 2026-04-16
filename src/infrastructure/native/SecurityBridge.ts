import {NativeModules, Platform} from 'react-native';

const {SecurityBridge} = NativeModules;

/**
 * Enables or disables Android's FLAG_SECURE on the main activity window.
 * When enabled the app cannot be screenshotted and its preview is hidden in
 * the recent apps switcher.
 *
 * Silently no-ops on non-Android platforms and when the native module is not
 * linked (e.g. in tests that do not mock it).
 */
export function setScreenshotProtection(enabled: boolean): void {
  if (Platform.OS !== 'android') {
    return;
  }
  if (!SecurityBridge?.setScreenshotProtection) {
    return;
  }
  try {
    SecurityBridge.setScreenshotProtection(enabled);
  } catch {
    /* non-critical: platform may not support the flag on older OEMs */
  }
}

export function isScreenshotProtectionAvailable(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }
  return Boolean(SecurityBridge?.setScreenshotProtection);
}
