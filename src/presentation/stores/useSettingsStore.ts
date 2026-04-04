import {create} from 'zustand';

type SettingsState = {
  themeMode: 'light' | 'dark' | 'system';
  dateFormat: 'US' | 'EU' | 'ISO';
  firstDayOfWeek: 'monday' | 'sunday';
  notificationEnabled: boolean;
  onboardingCompleted: boolean;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setDateFormat: (format: 'US' | 'EU' | 'ISO') => void;
  setFirstDayOfWeek: (day: 'monday' | 'sunday') => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'system',
  dateFormat: 'US',
  firstDayOfWeek: 'monday',
  notificationEnabled: true,
  onboardingCompleted: false,
  setThemeMode: (mode) => set({themeMode: mode}),
  setDateFormat: (format) => set({dateFormat: format}),
  setFirstDayOfWeek: (day) => set({firstDayOfWeek: day}),
  setNotificationEnabled: (enabled) => set({notificationEnabled: enabled}),
  setOnboardingCompleted: (completed) => set({onboardingCompleted: completed}),
}));
