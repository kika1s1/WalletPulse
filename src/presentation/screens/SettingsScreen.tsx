import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {APP_VERSION} from '@shared/constants/app';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {
  AUTO_LOCK_TIMEOUT_OPTIONS,
  usePinStore,
} from '@presentation/stores/usePinStore';
import {isBiometricAvailable} from '@infrastructure/security/biometric-service';
import {
  getStoredPinLength,
  type PinLength,
} from '@infrastructure/security/pin-service';
import {isScreenshotProtectionAvailable} from '@infrastructure/native/SecurityBridge';
import {useNotificationListener} from '@presentation/hooks/useNotificationListener';
import {WalletPulseLogoMark} from '@presentation/components/WalletPulseLogo';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {HolographicFingerprint} from '@presentation/components/common/HolographicFingerprint';
import {PinPad} from '@presentation/components/PinPad';
import {
  backupFilename,
  buildBackupJson,
  createBackup,
  listBackups,
  restoreBackup,
  type BackupFileInfo,
} from '@infrastructure/backup/backup-service';
import {
  isFileSaverAvailable,
  saveFileWithPicker,
} from '@infrastructure/native/FileSaverBridge';
import {useAuthStore} from '@presentation/stores/useAuthStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

type SettingsRowProps = {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  disabled?: boolean;
  description?: string;
};

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  trailing,
  disabled,
  description,
}: SettingsRowProps) {
  const {colors, spacing, radius} = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderRadius: radius.md,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <AppIcon name={icon} size={20} color={colors.primary} />
      <View style={styles.rowCenter}>
        <Text style={[styles.rowLabel, {color: colors.text}]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDesc, {color: colors.textTertiary}]}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <View style={styles.rowRight}>
          {value ? (
            <Text style={[styles.rowValue, {color: colors.textSecondary}]}>
              {value}
            </Text>
          ) : null}
          {onPress ? (
            <Text style={[styles.chevron, {color: colors.textTertiary}]}>
              ›
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({pressed}) => (pressed ? styles.pressed : undefined)}>
        {content}
      </Pressable>
    );
  }

  return content;
}

function SectionHeader({title}: {title: string}) {
  const {colors, spacing} = useTheme();
  return (
    <Text
      style={[
        styles.sectionTitle,
        {
          color: colors.textTertiary,
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
          marginHorizontal: spacing.xs,
        },
      ]}>
      {title}
    </Text>
  );
}

const THEME_LABELS: Record<string, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const DATE_LABELS: Record<string, string> = {
  US: 'MM/DD/YYYY',
  EU: 'DD/MM/YYYY',
  ISO: 'YYYY-MM-DD',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<Nav>();
  const settings = useSettingsStore();
  const isPinEnabled = usePinStore((s) => s.isPinEnabled);
  const removePinWithVerification = usePinStore(
    (s) => s.removePinWithVerification,
  );
  const biometricEnabled = usePinStore((s) => s.biometricEnabled);
  const enableBiometric = usePinStore((s) => s.enableBiometric);
  const disableBiometric = usePinStore((s) => s.disableBiometric);
  const autoLockTimeoutMs = usePinStore((s) => s.autoLockTimeoutMs);
  const setAutoLockTimeout = usePinStore((s) => s.setAutoLockTimeout);
  const screenshotProtectionEnabled = usePinStore((s) => s.screenshotProtectionEnabled);
  const setScreenshotProtectionEnabled = usePinStore(
    (s) => s.setScreenshotProtectionEnabled,
  );
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [autoLockPickerVisible, setAutoLockPickerVisible] = useState(false);
  const [biometricPinModalVisible, setBiometricPinModalVisible] = useState(false);
  const [biometricPinDraft, setBiometricPinDraft] = useState('');
  const [biometricPinError, setBiometricPinError] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [disablePinModalVisible, setDisablePinModalVisible] = useState(false);
  const [disablePinDraft, setDisablePinDraft] = useState('');
  const [disablePinError, setDisablePinError] = useState<string | null>(null);
  const [disablePinBusy, setDisablePinBusy] = useState(false);
  const [disablePinLength, setDisablePinLength] = useState<PinLength>(4);
  const [biometricPinLength, setBiometricPinLength] = useState<PinLength>(4);
  const screenshotSupported = useMemo(() => isScreenshotProtectionAvailable(), []);

  useEffect(() => {
    let cancelled = false;
    void isBiometricAvailable().then((supported) => {
      if (!cancelled) {
        setBiometricSupported(supported);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const autoLockLabel = useMemo(() => {
    const match = AUTO_LOCK_TIMEOUT_OPTIONS.find((o) => o.value === autoLockTimeoutMs);
    return match?.label ?? 'Immediately';
  }, [autoLockTimeoutMs]);

  const {
    isEnabled,
    isActive,
    isChecking,
    requestPermission,
    startListening,
    stopListening,
    recentCount,
  } = useNotificationListener();

  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);

  const openRestorePicker = useCallback(async () => {
    setRestoreBusy(true);
    try {
      const files = await listBackups();
      setBackupFiles(files);
      if (files.length === 0) {
        Alert.alert(
          'No backups found',
          'No WalletPulse backup files were found in your Downloads folder. Create a backup first, or copy a backup file into Downloads.',
        );
        return;
      }
      setRestoreModalVisible(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not list backups', msg);
    } finally {
      setRestoreBusy(false);
    }
  }, []);

  const runCreateBackup = useCallback(async () => {
    setBackupBusy(true);
    try {
      const uid = useAuthStore.getState().user?.id;
      if (!uid) { throw new Error('Not signed in'); }

      if (isFileSaverAvailable()) {
        const body = await buildBackupJson(uid);
        const outcome = await saveFileWithPicker({
          suggestedName: backupFilename(),
          mimeType: 'application/json',
          data: body,
          encoding: 'utf8',
        });
        if (outcome.status === 'saved') {
          Alert.alert('Backup saved', outcome.displayName ?? 'Backup saved successfully.');
        }
      } else {
        const path = await createBackup(uid);
        Alert.alert('Backup saved', path);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Backup failed', msg);
    } finally {
      setBackupBusy(false);
    }
  }, []);

  const confirmRestoreFromPath = useCallback((filePath: string, label: string) => {
    Alert.alert(
      'Restore from backup?',
      `This will erase all current data in WalletPulse and replace it with "${label}". This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setRestoreBusy(true);
            const uid = useAuthStore.getState().user?.id;
            if (!uid) { setRestoreBusy(false); return; }
            const result = await restoreBackup(filePath, uid);
            setRestoreBusy(false);
            if (result.ok) {
              Alert.alert('Restore complete', 'Your data was restored from the backup.');
            } else {
              Alert.alert('Restore failed', result.error);
            }
          },
        },
      ],
    );
  }, []);

  const themeCycle = useCallback(() => {
    const modes: Array<'light' | 'dark' | 'system'> = [
      'system',
      'light',
      'dark',
    ];
    const idx = modes.indexOf(settings.themeMode);
    settings.setThemeMode(modes[(idx + 1) % modes.length]);
  }, [settings]);

  const dateCycle = useCallback(() => {
    const formats: Array<'US' | 'EU' | 'ISO'> = ['US', 'EU', 'ISO'];
    const idx = formats.indexOf(settings.dateFormat);
    settings.setDateFormat(formats[(idx + 1) % formats.length]);
  }, [settings]);

  const weekCycle = useCallback(() => {
    settings.setFirstDayOfWeek(
      settings.firstDayOfWeek === 'monday' ? 'sunday' : 'monday',
    );
  }, [settings]);

  const handleNotificationToggle = useCallback(
    (val: boolean) => {
      if (val) {
        if (!isEnabled) {
          Alert.alert(
            'Permission Required',
            'WalletPulse needs notification access to auto-detect transactions. You will be redirected to Android settings.',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Open Settings', onPress: requestPermission},
            ],
          );
          return;
        }
        startListening();
        settings.setNotificationEnabled(true);
      } else {
        stopListening();
        settings.setNotificationEnabled(false);
      }
    },
    [isEnabled, requestPermission, settings, startListening, stopListening],
  );

  const notifStatus = useMemo(() => {
    if (isChecking) {
      return 'Checking...';
    }
    if (!isEnabled) {
      return 'Permission required';
    }
    if (isActive) {
      return recentCount > 0 ? `Active (${recentCount} detected)` : 'Active';
    }
    return 'Enabled';
  }, [isActive, isChecking, isEnabled, recentCount]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
            paddingTop: insets.top + 12,
          },
        ]}>
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          Settings
        </Text>
        <Text style={[styles.headerSub, {color: colors.textSecondary}]}>
          Customize your WalletPulse experience
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.base,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}>
        <SectionHeader title="ACCOUNT" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            icon="account-circle-outline"
            label="Profile"
            description="Manage your name, password, and account"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        <SectionHeader title="APPEARANCE" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            icon="palette-outline"
            label="Theme"
            onPress={themeCycle}
            value={THEME_LABELS[settings.themeMode]}
          />
          <SettingsRow
            icon="calendar-outline"
            label="Date Format"
            onPress={dateCycle}
            value={DATE_LABELS[settings.dateFormat]}
          />
          <SettingsRow
            icon="calendar-month-outline"
            label="First Day of Week"
            onPress={weekCycle}
            value={settings.firstDayOfWeek === 'monday' ? 'Monday' : 'Sunday'}
          />
        </View>

        <SectionHeader title="PRIVACY" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            description={settings.hideAmounts ? 'All amounts are hidden' : 'Amounts are visible'}
            icon={settings.hideAmounts ? 'eye-off-outline' : 'eye-outline'}
            label="Hide Amounts"
            trailing={
              <Switch
                onValueChange={() => settings.toggleHideAmounts()}
                thumbColor={settings.hideAmounts ? colors.primary : colors.border}
                trackColor={{false: colors.borderLight, true: colors.primaryLight}}
                value={settings.hideAmounts}
              />
            }
          />
        </View>

        <SectionHeader title="SECURITY" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            description={isPinEnabled ? 'PIN is active — your app is protected' : 'Add a PIN to protect your app'}
            icon="lock-outline"
            label="App PIN Lock"
            trailing={
              <Switch
                onValueChange={(val) => {
                  if (val) {
                    navigation.navigate('SetPin');
                  } else {
                    setDisablePinDraft('');
                    setDisablePinError(null);
                    void getStoredPinLength().then((len) => {
                      setDisablePinLength(len ?? 4);
                      setDisablePinModalVisible(true);
                    });
                  }
                }}
                thumbColor={isPinEnabled ? colors.primary : colors.border}
                trackColor={{false: colors.borderLight, true: colors.primaryLight}}
                value={isPinEnabled}
              />
            }
          />
          {isPinEnabled && (
            <SettingsRow
              description="Set a new PIN (4 or 6 digits)"
              icon="key-variant"
              label="Change PIN"
              onPress={() => navigation.navigate('SetPin')}
            />
          )}
          {isPinEnabled && biometricSupported && (
            <Pressable
              accessibilityLabel="Biometric Unlock"
              accessibilityRole="switch"
              accessibilityState={{
                checked: biometricEnabled,
                disabled: biometricBusy,
              }}
              disabled={biometricBusy}
              onPress={() => {
                if (biometricEnabled) {
                  void disableBiometric();
                  return;
                }
                setBiometricPinDraft('');
                setBiometricPinError(null);
                void getStoredPinLength().then((len) => {
                  setBiometricPinLength(len ?? 4);
                  setBiometricPinModalVisible(true);
                });
              }}
              style={({pressed}) => [
                styles.bioHoloRow,
                {
                  backgroundColor: '#0A0E1A',
                  borderColor: biometricEnabled
                    ? colors.primary + '55'
                    : 'rgba(255,255,255,0.08)',
                  borderRadius: radius.lg,
                  paddingVertical: spacing.lg,
                  transform: [{scale: pressed ? 0.98 : 1}],
                },
              ]}>
              <HolographicFingerprint
                accentColor={colors.primary}
                active={biometricEnabled}
                busy={biometricBusy}
                disabled={biometricBusy}
                glowColor={colors.primary}
                size={128}
              />
            </Pressable>
          )}
          {isPinEnabled && (
            <SettingsRow
              description="How long to wait before locking automatically"
              icon="timer-sand"
              label="Auto-lock"
              onPress={() => setAutoLockPickerVisible(true)}
              value={autoLockLabel}
            />
          )}
          {screenshotSupported && (
            <SettingsRow
              description={
                screenshotProtectionEnabled
                  ? 'Screenshots are blocked and the app preview is hidden'
                  : 'Block screenshots and hide preview in the app switcher'
              }
              icon="shield-lock-outline"
              label="Screenshot Protection"
              trailing={
                <Switch
                  onValueChange={(val) => setScreenshotProtectionEnabled(val)}
                  thumbColor={screenshotProtectionEnabled ? colors.primary : colors.border}
                  trackColor={{false: colors.borderLight, true: colors.primaryLight}}
                  value={screenshotProtectionEnabled}
                />
              }
            />
          )}
        </View>

        <SectionHeader title="NOTIFICATION TRACKING" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            description="Automatically detect transactions from push notifications"
            icon="bell-outline"
            label="Auto-detect Transactions"
            trailing={
              <Switch
                onValueChange={handleNotificationToggle}
                thumbColor={
                  settings.notificationEnabled ? colors.primary : colors.border
                }
                trackColor={{
                  false: colors.borderLight,
                  true: colors.primaryLight,
                }}
                value={settings.notificationEnabled && isEnabled}
              />
            }
          />
          <SettingsRow
            description={notifStatus}
            icon="chart-bar"
            label="Notification Log"
            onPress={() => navigation.navigate('NotificationLog')}
          />
          <SettingsRow
            description="Regex rules for apps without a built-in parser"
            icon="code-tags"
            label="Parsing Rules"
            onPress={() => navigation.navigate('ParsingRules')}
          />
          {!isEnabled && (
            <Pressable
              accessibilityRole="button"
              onPress={requestPermission}
              style={[
                styles.permissionBanner,
                {
                  backgroundColor: colors.warningLight,
                  borderColor: colors.warning,
                  borderRadius: radius.md,
                  padding: spacing.md,
                },
              ]}>
              <AppIcon name="alert-circle-outline" size={20} color={colors.warning} />
              <View style={{flex: 1}}>
                <Text
                  style={[styles.permBannerTitle, {color: colors.text}]}>
                  Notification access required
                </Text>
                <Text
                  style={[
                    styles.permBannerMsg,
                    {color: colors.textSecondary},
                  ]}>
                  Tap to open Android settings and grant notification listener
                  permission to WalletPulse.
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        <SectionHeader title="FINANCIAL PLANNING" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            description="Set spending limits per category"
            icon="cash-multiple"
            label="Budgets"
            onPress={() => navigation.navigate('BudgetList')}
            value="Manage"
          />
          <SettingsRow
            description="Track upcoming bills and due dates"
            icon="bell-ring-outline"
            label="Bill Reminders"
            onPress={() => navigation.navigate('BillReminders')}
            value="View"
          />
          <SettingsRow
            description="Get notified before bills are due"
            icon="bell-badge-outline"
            label="Bill Reminder Alerts"
            trailing={
              <Switch
                onValueChange={(val) => settings.setBillReminderNotificationsEnabled(val)}
                thumbColor={
                  settings.billReminderNotificationsEnabled ? colors.primary : colors.border
                }
                trackColor={{
                  false: colors.borderLight,
                  true: colors.primaryLight,
                }}
                value={settings.billReminderNotificationsEnabled}
              />
            }
          />
          <SettingsRow
            description="Set and track savings targets"
            icon="target"
            label="Savings Goals"
            onPress={() => navigation.navigate('GoalsList')}
            value="View"
          />
          <SettingsRow
            description="Monitor recurring service costs"
            icon="sync-circle"
            label="Subscriptions"
            onPress={() => navigation.navigate('SubscriptionsList')}
            value="View"
          />
          <SettingsRow
            description="Get notified before subscriptions renew"
            icon="bell-check-outline"
            label="Subscription Alerts"
            trailing={
              <Switch
                onValueChange={(val) => settings.setSubscriptionNotificationsEnabled(val)}
                thumbColor={
                  settings.subscriptionNotificationsEnabled ? colors.primary : colors.border
                }
                trackColor={{
                  false: colors.borderLight,
                  true: colors.primaryLight,
                }}
                value={settings.subscriptionNotificationsEnabled}
              />
            }
          />
        </View>

        <SectionHeader title="DATA" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            description="Save a full copy of your data as JSON to a folder you choose"
            icon="cloud-upload-outline"
            label="Create Backup"
            disabled={backupBusy || restoreBusy}
            onPress={runCreateBackup}
            trailing={
              backupBusy ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <View style={styles.rowRight}>
                  <Text style={[styles.chevron, {color: colors.textTertiary}]}>
                    ›
                  </Text>
                </View>
              )
            }
          />
          <SettingsRow
            description="Replace all app data from a backup file in Downloads"
            icon="backup-restore"
            label="Restore from Backup"
            disabled={backupBusy || restoreBusy}
            onPress={openRestorePicker}
            trailing={
              restoreBusy ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <View style={styles.rowRight}>
                  <Text style={[styles.chevron, {color: colors.textTertiary}]}>
                    ›
                  </Text>
                </View>
              )
            }
          />
          <SettingsRow
            icon="tag-outline"
            label="Categories"
            onPress={() => navigation.navigate('CategoryManagement')}
            value="Manage"
          />
          <SettingsRow
            description="Pre-fill common transactions with one tap"
            icon="lightning-bolt"
            label="Quick Templates"
            onPress={() => navigation.navigate('TemplateManagement')}
            value="Manage"
          />
          <SettingsRow
            description="Export transactions as CSV or JSON"
            icon="export-variant"
            label="Export Data"
            onPress={() => navigation.navigate('Export')}
            value="Export"
          />
          <SettingsRow
            description="Generate a professional PDF statement"
            icon="file-document-outline"
            label="Account Statement"
            onPress={() => navigation.navigate('AccountStatement')}
            value="Generate"
          />
        </View>

        <SectionHeader title="ABOUT" />
        <View
          style={[
            styles.aboutCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              borderRadius: radius.lg,
              padding: spacing.base,
            },
          ]}>
          <WalletPulseLogoMark size={56} />
          <View style={styles.aboutInfo}>
            <Text style={[styles.aboutName, {color: colors.text}]}>
              WalletPulse
            </Text>
            <Text style={[styles.aboutVersion, {color: colors.textSecondary}]}>
              Version {APP_VERSION}
            </Text>
            <Text style={[styles.aboutDesc, {color: colors.textTertiary}]}>
              Smart, offline-first expense tracker
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={restoreModalVisible}
        onRequestClose={() => setRestoreModalVisible(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close backup list"
          onPress={() => setRestoreModalVisible(false)}
          style={styles.modalBackdrop}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                padding: spacing.base,
              },
            ]}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>
              Choose backup
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                {color: colors.textSecondary, marginBottom: spacing.md},
              ]}>
              Files in Downloads named WalletPulse-backup-*.json
            </Text>
            <FlatList
              data={backupFiles}
              keyExtractor={(item) => item.path}
              style={{maxHeight: 320}}
              renderItem={({item}) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setRestoreModalVisible(false);
                    confirmRestoreFromPath(item.path, item.name);
                  }}
                  style={({pressed}) => [
                    styles.backupRow,
                    {
                      backgroundColor: pressed
                        ? colors.background
                        : colors.surface,
                      borderColor: colors.borderLight,
                    },
                  ]}>
                  <Text
                    style={[styles.backupRowName, {color: colors.text}]}
                    numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.backupRowMeta, {color: colors.textTertiary}]}>
                    {item.size > 0
                      ? `${Math.max(1, Math.round(item.size / 1024))} KB`
                      : ''}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setRestoreModalVisible(false)}
              style={[
                styles.modalCancelBtn,
                {marginTop: spacing.md, borderColor: colors.borderLight},
              ]}>
              <Text style={[styles.modalCancelText, {color: colors.primary}]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        visible={biometricPinModalVisible}
        onRequestClose={() => setBiometricPinModalVisible(false)}>
        <View
          style={[
            styles.fullScreenModal,
            {backgroundColor: colors.background},
          ]}>
          <Pressable
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setBiometricPinModalVisible(false)}
            style={[
              styles.fullScreenCloseBtn,
              {top: insets.top + 12},
            ]}>
            <AppIcon name="close" size={24} color={colors.text} />
          </Pressable>
          <PinPad
            title="Confirm your PIN"
            subtitle="Enter your PIN to enable biometric unlock"
            pin={biometricPinDraft}
            length={biometricPinLength}
            error={biometricPinError}
            onPinChange={(next) => {
              if (biometricBusy) {
                return;
              }
              setBiometricPinError(null);
              setBiometricPinDraft(next);
              if (next.length !== biometricPinLength) {
                return;
              }
              setBiometricBusy(true);
              void (async () => {
                try {
                  const store = usePinStore.getState();
                  const ok = await store.verifyPin(next);
                  if (!ok) {
                    setBiometricPinError('Wrong PIN');
                    setBiometricPinDraft('');
                    return;
                  }
                  await enableBiometric(next);
                  setBiometricPinModalVisible(false);
                  setBiometricPinDraft('');
                  setBiometricPinError(null);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  setBiometricPinError(msg);
                  setBiometricPinDraft('');
                } finally {
                  setBiometricBusy(false);
                }
              })();
            }}
          />
        </View>
      </Modal>

      <Modal
        animationType="slide"
        visible={disablePinModalVisible}
        onRequestClose={() => setDisablePinModalVisible(false)}>
        <View
          style={[
            styles.fullScreenModal,
            {backgroundColor: colors.background},
          ]}>
          <Pressable
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setDisablePinModalVisible(false)}
            style={[
              styles.fullScreenCloseBtn,
              {top: insets.top + 12},
            ]}>
            <AppIcon name="close" size={24} color={colors.text} />
          </Pressable>
          <PinPad
            title="Remove PIN lock"
            subtitle="Enter your current PIN to turn off the app lock"
            pin={disablePinDraft}
            length={disablePinLength}
            error={disablePinError}
            onPinChange={(next) => {
              if (disablePinBusy) {
                return;
              }
              setDisablePinError(null);
              setDisablePinDraft(next);
              if (next.length !== disablePinLength) {
                return;
              }
              setDisablePinBusy(true);
              void (async () => {
                try {
                  const result = await removePinWithVerification(next);
                  if (!result.ok) {
                    setDisablePinError('Wrong PIN');
                    setDisablePinDraft('');
                    return;
                  }
                  setDisablePinModalVisible(false);
                  setDisablePinDraft('');
                  setDisablePinError(null);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  setDisablePinError(msg);
                  setDisablePinDraft('');
                } finally {
                  setDisablePinBusy(false);
                }
              })();
            }}
          />
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={autoLockPickerVisible}
        onRequestClose={() => setAutoLockPickerVisible(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close auto-lock picker"
          onPress={() => setAutoLockPickerVisible(false)}
          style={styles.modalBackdrop}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                padding: spacing.base,
              },
            ]}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>
              Auto-lock timeout
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                {color: colors.textSecondary, marginBottom: spacing.md},
              ]}>
              Choose how long the app can stay unlocked in the background.
            </Text>
            {AUTO_LOCK_TIMEOUT_OPTIONS.map((opt) => {
              const selected = opt.value === autoLockTimeoutMs;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityState={{selected}}
                  onPress={() => {
                    setAutoLockTimeout(opt.value);
                    setAutoLockPickerVisible(false);
                  }}
                  style={({pressed}) => [
                    styles.backupRow,
                    {
                      backgroundColor: pressed
                        ? colors.background
                        : selected
                          ? colors.primaryLight + '20'
                          : colors.surface,
                      borderColor: selected ? colors.primary : colors.borderLight,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.backupRowName,
                      {color: selected ? colors.primary : colors.text},
                    ]}>
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Text
                      style={[styles.backupRowMeta, {color: colors.primary}]}>
                      Selected
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => setAutoLockPickerVisible(false)}
              style={[
                styles.modalCancelBtn,
                {marginTop: spacing.md, borderColor: colors.borderLight},
              ]}>
              <Text style={[styles.modalCancelText, {color: colors.primary}]}>
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    lineHeight: 34,
  },
  headerSub: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  pressed: {
    opacity: 0.88,
  },
  rowIcon: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  rowCenter: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    marginLeft: 2,
  },
  bioHoloRow: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    gap: 10,
  },
  permBannerIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  permBannerTitle: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  permBannerMsg: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  aboutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  aboutInfo: {
    flex: 1,
    gap: 2,
  },
  aboutName: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  aboutVersion: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  aboutDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  backupRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  backupRowName: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
  },
  backupRowMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  fullScreenModal: {
    flex: 1,
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
