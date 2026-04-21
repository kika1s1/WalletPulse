import {useCallback, useEffect, useRef, useState} from 'react';
import type {NotificationLog} from '@domain/entities/NotificationLog';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';

export type UseNotificationLogsReturn = {
  logs: NotificationLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useNotificationLogs(limit: number = 50): UseNotificationLogsReturn {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ds = getSupabaseDataSource();
        const result = await ds.notificationLogs.findRecent(limit);
        if (!cancelled && mountedRef.current) {
          setLogs(result);
        }
      } catch (e) {
        if (!cancelled && mountedRef.current) {
          setError(e instanceof Error ? e.message : 'Failed to load logs');
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit, tick]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {logs, isLoading, error, refetch};
}
