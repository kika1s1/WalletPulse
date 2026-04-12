import {NativeModules, DeviceEventEmitter, Platform} from 'react-native';

const {NotificationBridge} = NativeModules;
const EVENT_NAME = 'onNotificationReceived';

export type NativeNotificationEvent = {
  packageName: string;
  title: string;
  body: string;
  receivedAt: number;
};

export type NotificationListener = (event: NativeNotificationEvent) => void;

export function subscribeToNotifications(
  listener: NotificationListener,
): () => void {
  if (Platform.OS !== 'android') {
    return () => {};
  }
  const subscription = DeviceEventEmitter.addListener(EVENT_NAME, listener);
  return () => subscription.remove();
}

export async function isListenerEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    return await NotificationBridge.isListenerEnabled();
  } catch {
    return false;
  }
}

export async function openListenerSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await NotificationBridge.openListenerSettings();
  } catch {
    // Non-critical
  }
}

