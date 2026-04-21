import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useAppStore} from '@presentation/stores/useAppStore';
import {isDataSourceReady, getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';

const SETTINGS_KEY = 'user_preferences';
const APP_KEY = 'app_preferences';

type SyncableSettings = {
  themeMode: 'light' | 'dark' | 'system';
  activeThemeId: string;
  dateFormat: 'US' | 'EU' | 'ISO';
  firstDayOfWeek: 'monday' | 'sunday';
  notificationEnabled: boolean;
  billReminderNotificationsEnabled: boolean;
  subscriptionNotificationsEnabled: boolean;
  hideAmounts: boolean;
};

type SyncableAppSettings = {
  baseCurrency: string;
};

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let appPushTimer: ReturnType<typeof setTimeout> | null = null;
let isPulling = false;

function getSettingsRepo() {
  if (!isDataSourceReady()) { return null; }
  return getSupabaseDataSource().settings;
}

export async function pullSettingsFromSupabase(): Promise<void> {
  const repo = getSettingsRepo();
  if (!repo) { return; }

  isPulling = true;
  try {
    const [prefs, appPrefs] = await Promise.all([
      repo.getJson<SyncableSettings>(SETTINGS_KEY),
      repo.getJson<SyncableAppSettings>(APP_KEY),
    ]);

    if (prefs) {
      const store = useSettingsStore.getState();
      if (prefs.themeMode) { store.setThemeMode(prefs.themeMode); }
      if (prefs.activeThemeId) { store.setActiveThemeId(prefs.activeThemeId as any); }
      if (prefs.dateFormat) { store.setDateFormat(prefs.dateFormat); }
      if (prefs.firstDayOfWeek) { store.setFirstDayOfWeek(prefs.firstDayOfWeek); }
      if (typeof prefs.notificationEnabled === 'boolean') { store.setNotificationEnabled(prefs.notificationEnabled); }
      if (typeof prefs.billReminderNotificationsEnabled === 'boolean') { store.setBillReminderNotificationsEnabled(prefs.billReminderNotificationsEnabled); }
      if (typeof prefs.subscriptionNotificationsEnabled === 'boolean') { store.setSubscriptionNotificationsEnabled(prefs.subscriptionNotificationsEnabled); }
      if (typeof prefs.hideAmounts === 'boolean' && prefs.hideAmounts !== store.hideAmounts) {
        store.toggleHideAmounts();
      }
    }

    if (appPrefs) {
      if (appPrefs.baseCurrency) {
        useAppStore.getState().setBaseCurrency(appPrefs.baseCurrency);
      }
    }
  } catch {
    // Non-fatal: local cache still works
  } finally {
    isPulling = false;
  }
}

function collectSettingsSnapshot(): SyncableSettings {
  const s = useSettingsStore.getState();
  return {
    themeMode: s.themeMode,
    activeThemeId: s.activeThemeId,
    dateFormat: s.dateFormat,
    firstDayOfWeek: s.firstDayOfWeek,
    notificationEnabled: s.notificationEnabled,
    billReminderNotificationsEnabled: s.billReminderNotificationsEnabled,
    subscriptionNotificationsEnabled: s.subscriptionNotificationsEnabled,
    hideAmounts: s.hideAmounts,
  };
}

function collectAppSnapshot(): SyncableAppSettings {
  return {baseCurrency: useAppStore.getState().baseCurrency};
}

export function pushSettingsToSupabase(): void {
  if (isPulling) { return; }
  if (pushTimer) { clearTimeout(pushTimer); }
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    const repo = getSettingsRepo();
    if (!repo) { return; }
    try {
      await repo.setJson(SETTINGS_KEY, collectSettingsSnapshot());
    } catch {
      // Non-fatal
    }
  }, 500);
}

export function pushAppSettingsToSupabase(): void {
  if (isPulling) { return; }
  if (appPushTimer) { clearTimeout(appPushTimer); }
  appPushTimer = setTimeout(async () => {
    appPushTimer = null;
    const repo = getSettingsRepo();
    if (!repo) { return; }
    try {
      await repo.setJson(APP_KEY, collectAppSnapshot());
    } catch {
      // Non-fatal
    }
  }, 500);
}

let settingsUnsub: (() => void) | null = null;
let appUnsub: (() => void) | null = null;

export function startSettingsSync(): void {
  stopSettingsSync();

  settingsUnsub = useSettingsStore.subscribe((_state, _prevState) => {
    pushSettingsToSupabase();
  });

  appUnsub = useAppStore.subscribe((_state, _prevState) => {
    pushAppSettingsToSupabase();
  });
}

export function stopSettingsSync(): void {
  if (settingsUnsub) { settingsUnsub(); settingsUnsub = null; }
  if (appUnsub) { appUnsub(); appUnsub = null; }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  if (appPushTimer) { clearTimeout(appPushTimer); appPushTimer = null; }
}
