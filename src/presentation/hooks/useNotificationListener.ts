import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {isListenerEnabled, openListenerSettings} from '@infrastructure/native/NotificationBridge';
import {
  startNotificationHandler,
  stopNotificationHandler,
} from '@infrastructure/notification/notification-handler';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {makeShouldProcessNotification} from '@shared/utils/notification-package-filter';

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

  const monitoredAppPackageIds = useSettingsStore((s) => s.monitoredAppPackageIds);
  const handlerOpts = useMemo(
    () => ({
      shouldProcessPackage: makeShouldProcessNotification(monitoredAppPackageIds),
    }),
    [monitoredAppPackageIds],
  );

  const startListening = useCallback(() => {
    if (stopRef.current) {
      return;
    }
    stopRef.current = startNotificationHandler(
      {
        onTransactionCreated: () => {
          if (mountedRef.current) {
            setRecentCount((c) => c + 1);
          }
        },
      },
      handlerOpts,
    );
    setIsActive(true);
  }, [handlerOpts]);

  const stopListeningFn = useCallback(() => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    stopNotificationHandler();
    setIsActive(false);
  }, []);

  const notificationEnabled = useSettingsStore((s) => s.notificationEnabled);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function init() {
      await checkPermission();
      if (cancelled) {return;}

      const enabled = await isListenerEnabled();
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
      if (enabled && notificationEnabled) {
        stopRef.current = startNotificationHandler(
          {
            onTransactionCreated: () => {
              if (mountedRef.current) {
                setRecentCount((c) => c + 1);
              }
            },
          },
          handlerOpts,
        );
        if (mountedRef.current) {setIsActive(true);}
      } else if (mountedRef.current) {
        setIsActive(false);
      }
    }

    init();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        checkPermission();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      cancelled = true;
      mountedRef.current = false;
      sub.remove();
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
  }, [checkPermission, notificationEnabled, handlerOpts]);

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
