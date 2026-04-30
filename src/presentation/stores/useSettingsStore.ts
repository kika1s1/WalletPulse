import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ThemeId} from '@shared/theme/colors';
import {DEFAULT_MONITORED_APP_PACKAGE_IDS} from '@shared/constants/monitored-finance-apps';

type SettingsState = {
  themeMode: 'light' | 'dark' | 'system';
  activeThemeId: ThemeId;
  dateFormat: 'US' | 'EU' | 'ISO';
  firstDayOfWeek: 'monday' | 'sunday';
  notificationEnabled: boolean;
  /** Android packages with built-in parsers that the user wants to treat as transaction sources */
  monitoredAppPackageIds: string[];
  billReminderNotificationsEnabled: boolean;
  subscriptionNotificationsEnabled: boolean;
  recurringChargeNotificationsEnabled: boolean;
  onboardingCompleted: boolean;
  hideAmounts: boolean;
  onboardingCurrency: string;
  pendingSeedComplete: boolean;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setActiveThemeId: (id: ThemeId) => void;
  setDateFormat: (format: 'US' | 'EU' | 'ISO') => void;
  setFirstDayOfWeek: (day: 'monday' | 'sunday') => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setBillReminderNotificationsEnabled: (enabled: boolean) => void;
  setSubscriptionNotificationsEnabled: (enabled: boolean) => void;
  setRecurringChargeNotificationsEnabled: (enabled: boolean) => void;
  setMonitoredAppPackageIds: (ids: string[]) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  toggleHideAmounts: () => void;
  setOnboardingCurrency: (currency: string) => void;
  setPendingSeedComplete: (done: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      activeThemeId: 'default' as ThemeId,
      dateFormat: 'US',
      firstDayOfWeek: 'monday',
      notificationEnabled: false,
      monitoredAppPackageIds: [...DEFAULT_MONITORED_APP_PACKAGE_IDS],
      billReminderNotificationsEnabled: true,
      subscriptionNotificationsEnabled: true,
      recurringChargeNotificationsEnabled: true,
      onboardingCompleted: false,
      hideAmounts: false,
      onboardingCurrency: 'USD',
      pendingSeedComplete: false,
      setThemeMode: (mode) => set({themeMode: mode}),
      setActiveThemeId: (id) => set({activeThemeId: id}),
      setDateFormat: (format) => set({dateFormat: format}),
      setFirstDayOfWeek: (day) => set({firstDayOfWeek: day}),
      setNotificationEnabled: (enabled) => set({notificationEnabled: enabled}),
      setMonitoredAppPackageIds: (ids) => set({monitoredAppPackageIds: ids}),
      setBillReminderNotificationsEnabled: (enabled) => set({billReminderNotificationsEnabled: enabled}),
      setSubscriptionNotificationsEnabled: (enabled) => set({subscriptionNotificationsEnabled: enabled}),
      setRecurringChargeNotificationsEnabled: (enabled) => set({recurringChargeNotificationsEnabled: enabled}),
      setOnboardingCompleted: (completed) => set({onboardingCompleted: completed}),
      toggleHideAmounts: () => set((s) => ({hideAmounts: !s.hideAmounts})),
      setOnboardingCurrency: (currency) => set({onboardingCurrency: currency}),
      setPendingSeedComplete: (done) => set({pendingSeedComplete: done}),
    }),
    {
      name: 'walletpulse-settings',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsState>;
        return {
          ...current,
          ...p,
          monitoredAppPackageIds:
            Array.isArray(p.monitoredAppPackageIds) && p.monitoredAppPackageIds.length > 0
              ? p.monitoredAppPackageIds
              : [...DEFAULT_MONITORED_APP_PACKAGE_IDS],
        };
      },
    },
  ),
);
