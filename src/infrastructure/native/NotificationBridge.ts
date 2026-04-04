import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

const {NotificationBridge} = NativeModules;
const EVENT_NAME = 'onNotificationReceived';

export type NativeNotificationEvent = {
  packageName: string;
  title: string;
  body: string;
  receivedAt: number;
};

export type NotificationListener = (event: NativeNotificationEvent) => void;

let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (!emitter) {
    emitter = new NativeEventEmitter(NotificationBridge);
  }
  return emitter;
}

export function subscribeToNotifications(
  listener: NotificationListener,
): () => void {
  if (Platform.OS !== 'android') {
    return () => {};
  }
  const subscription = getEmitter().addListener(EVENT_NAME, listener);
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

export async function getWatchedPackages(): Promise<string[]> {
  if (Platform.OS !== 'android') {
    return [];
  }
  try {
    return await NotificationBridge.getWatchedPackages();
  } catch {
    return [];
  }
}
