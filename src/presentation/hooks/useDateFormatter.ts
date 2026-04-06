import {useCallback} from 'react';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {
  formatDateWithPreference,
  formatDateLong,
  formatRelativeDate as baseFormatRelative,
  daysBetween,
  type DateFormatPreference,
} from '@shared/utils/date-helpers';

export function useDateFormatter() {
  const dateFormat = useSettingsStore(
    (s) => s.dateFormat,
  ) as DateFormatPreference;

  const formatDate = useCallback(
    (timestampMs: number) => formatDateWithPreference(timestampMs, dateFormat),
    [dateFormat],
  );

  const formatLong = useCallback(
    (timestampMs: number) => formatDateLong(timestampMs, dateFormat),
    [dateFormat],
  );

  const formatRelative = useCallback(
    (timestampMs: number, nowMs: number = Date.now()) => {
      const days = daysBetween(timestampMs, nowMs);
      if (days < 7) {
        return baseFormatRelative(timestampMs, nowMs);
      }
      return formatDateWithPreference(timestampMs, dateFormat);
    },
    [dateFormat],
  );

  return {formatDate, formatLong, formatRelative, dateFormat};
}
