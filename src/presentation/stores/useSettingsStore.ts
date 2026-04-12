import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ThemeId} from '@shared/theme/colors';

type SettingsState = {
  themeMode: 'light' | 'dark' | 'system';
  activeThemeId: ThemeId;
  dateFormat: 'US' | 'EU' | 'ISO';
  firstDayOfWeek: 'monday' | 'sunday';
  notificationEnabled: boolean;
  billReminderNotificationsEnabled: boolean;
  subscriptionNotificationsEnabled: boolean;
  onboardingCompleted: boolean;
  hideAmounts: boolean;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setActiveThemeId: (id: ThemeId) => void;
  setDateFormat: (format: 'US' | 'EU' | 'ISO') => void;
  setFirstDayOfWeek: (day: 'monday' | 'sunday') => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setBillReminderNotificationsEnabled: (enabled: boolean) => void;
  setSubscriptionNotificationsEnabled: (enabled: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  toggleHideAmounts: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      activeThemeId: 'default' as ThemeId,
      dateFormat: 'US',
      firstDayOfWeek: 'monday',
      notificationEnabled: true,
      billReminderNotificationsEnabled: true,
      subscriptionNotificationsEnabled: true,
      onboardingCompleted: false,
      hideAmounts: false,
      setThemeMode: (mode) => set({themeMode: mode}),
      setActiveThemeId: (id) => set({activeThemeId: id}),
      setDateFormat: (format) => set({dateFormat: format}),
      setFirstDayOfWeek: (day) => set({firstDayOfWeek: day}),
      setNotificationEnabled: (enabled) => set({notificationEnabled: enabled}),
      setBillReminderNotificationsEnabled: (enabled) => set({billReminderNotificationsEnabled: enabled}),
      setSubscriptionNotificationsEnabled: (enabled) => set({subscriptionNotificationsEnabled: enabled}),
      setOnboardingCompleted: (completed) => set({onboardingCompleted: completed}),
      toggleHideAmounts: () => set((s) => ({hideAmounts: !s.hideAmounts})),
    }),
    {
      name: 'walletpulse-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
