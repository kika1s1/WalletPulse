import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {isListenerEnabled, openListenerSettings} from '@infrastructure/native/NotificationBridge';
import {
  startNotificationHandler,
  stopNotificationHandler,
} from '@infrastructure/notification/notification-handler';

export type UseNotificationListenerReturn = {
  isEnabled: boolean;
  isChecking: boolean;
  isActive: boolean;
  checkPermission: () => Promise<void>;
  requestPermission: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  recentCount: number;
};

export function useNotificationListener(): UseNotificationListenerReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [recentCount, setRecentCount] = useState(0);
  const mountedRef = useRef(true);
  const stopRef = useRef<(() => void) | null>(null);

  const checkPermission = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }
    setIsChecking(true);
    try {
      const enabled = await isListenerEnabled();
      if (mountedRef.current) {
        setIsEnabled(enabled);
      }
    } catch {
      if (mountedRef.current) {
        setIsEnabled(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    await openListenerSettings();
  }, []);

  const startListening = useCallback(() => {
    if (stopRef.current) {
      return;
    }
    stopRef.current = startNotificationHandler({
      onTransactionCreated: () => {
        if (mountedRef.current) {
          setRecentCount((c) => c + 1);
        }
      },
    });
    setIsActive(true);
  }, []);

  const stopListeningFn = useCallback(() => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    stopNotificationHandler();
    setIsActive(false);
  }, []);

  useEffect(() => {
    checkPermission();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        checkPermission();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      mountedRef.current = false;
      sub.remove();
      if (stopRef.current) {
        stopRef.current();
      }
    };
  }, [checkPermission]);

  return {
    isEnabled,
    isChecking,
    isActive,
    checkPermission,
    requestPermission,
    startListening,
    stopListening: stopListeningFn,
    recentCount,
  };
}
