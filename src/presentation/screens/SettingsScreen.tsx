import React, {useCallback, useMemo} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useNotificationListener} from '@presentation/hooks/useNotificationListener';

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
      <Text style={styles.rowIcon}>{icon}</Text>
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
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const settings = useSettingsStore();
  const {
    isEnabled,
    isActive,
    isChecking,
    requestPermission,
    startListening,
    stopListening,
    recentCount,
  } = useNotificationListener();

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
          paddingBottom: spacing['4xl'],
        }}
        showsVerticalScrollIndicator={false}>
        <SectionHeader title="APPEARANCE" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            icon="🎨"
            label="Theme"
            onPress={themeCycle}
            value={THEME_LABELS[settings.themeMode]}
          />
          <SettingsRow
            icon="📅"
            label="Date Format"
            onPress={dateCycle}
            value={DATE_LABELS[settings.dateFormat]}
          />
          <SettingsRow
            icon="📆"
            label="First Day of Week"
            onPress={weekCycle}
            value={settings.firstDayOfWeek === 'monday' ? 'Monday' : 'Sunday'}
          />
        </View>

        <SectionHeader title="NOTIFICATION TRACKING" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            description="Automatically detect transactions from push notifications"
            icon="🔔"
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
            icon="📊"
            label="Notification Log"
            onPress={() => navigation.navigate('NotificationLog')}
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
              <Text style={styles.permBannerIcon}>⚠️</Text>
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

        <SectionHeader title="DATA" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            icon="🏷️"
            label="Categories"
            onPress={() => navigation.navigate('CategoryManagement')}
            value="Manage"
          />
        </View>

        <SectionHeader title="ABOUT" />
        <View style={{gap: spacing.sm}}>
          <SettingsRow
            icon="📱"
            label="App Version"
            value="1.0.0"
          />
          <SettingsRow
            icon="🏗️"
            label="Architecture"
            value="Clean + TDD"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 56,
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
});
