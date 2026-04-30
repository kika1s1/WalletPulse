import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {WalletPulseLogoMark} from '@presentation/components/WalletPulseLogo';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useAppStore} from '@presentation/stores/useAppStore';
import {
  getOnboardingSteps,
  validateOnboardingStep,
  type OnboardingState,
} from '@domain/usecases/onboarding-validation';
import {normalizeOnboardingCurrencyCode} from '@domain/usecases/normalize-onboarding-currency';
import {POPULAR_CURRENCIES} from '@shared/constants/currencies';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';
import {
  BUILTIN_MONITORED_FINANCE_APPS,
  DEFAULT_MONITORED_APP_PACKAGE_IDS,
} from '@shared/constants/monitored-finance-apps';
import {useNotificationListener} from '@presentation/hooks/useNotificationListener';

const PREVIEW_CATEGORY_COUNT = 6;
const APP_ROW_GAP = 10;

function StepIndicator({total, current, colors}: {total: number; current: number; colors: any}) {
  return (
    <View
      accessibilityLabel={`Onboarding step ${current + 1} of ${total}`}
      style={styles.indicatorRow}>
      {Array.from({length: total}).map((_, i) => {
        const isActive = i === current;
        const isPast = i < current;
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: isActive
                  ? colors.primary
                  : isPast
                    ? colors.primaryLight
                    : colors.border,
                width: isActive ? 24 : 8,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function WelcomeStep({colors}: any) {
  return (
    <View style={styles.stepContent}>
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.iconCircle}>
        <WalletPulseLogoMark size={88} />
      </Animated.View>
      <Animated.Text
        entering={FadeInUp.delay(300).duration(400)}
        style={[styles.heroTitle, {color: colors.text}]}
      >
        Welcome to WalletPulse
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(400).duration(400)}
        style={[styles.heroSubtitle, {color: colors.textSecondary}]}
      >
        Track spending and budgets with secure cloud sync. On Android, optionally capture transactions from supported bank app notifications on this device.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(600).duration(400)} style={styles.featureList}>
        {[
          {icon: 'bell-outline', label: 'Auto-detect from notifications (when allowed)'},
          {icon: 'swap-horizontal-circle-outline', label: 'Multi-currency wallets and conversion'},
          {icon: 'cloud-outline', label: 'Sync your data to your account'},
          {icon: 'chart-bar', label: 'Budgets and spending insights'},
        ].map((f, idx) => (
          <Animated.View
            key={f.label}
            entering={FadeInDown.delay(700 + idx * 100).duration(300)}
            style={styles.featureRow}
          >
            <View style={[styles.featureDot, {backgroundColor: colors.success + '33'}]}>
              <AppIcon name={f.icon} size={14} color={colors.success} />
            </View>
            <Text style={[styles.featureLabel, {color: colors.text}]}>{f.label}</Text>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

function CurrencyStep({
  selected,
  onSelect,
  colors,
  radius,
}: {
  selected: string;
  onSelect: (c: string) => void;
  colors: any;
  radius: any;
}) {
  const {width: screenW} = Dimensions.get('window');
  return (
    <View style={styles.stepContent}>
      <Animated.Text
        entering={FadeInUp.delay(100).duration(300)}
        style={[styles.stepTitle, {color: colors.text}]}
      >
        Choose your currency
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(300)}
        style={[styles.stepSubtitle, {color: colors.textSecondary}]}
      >
        This will be your default currency. You can add more later and convert between them.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.currencyGrid}>
        {POPULAR_CURRENCIES.map((code) => (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{selected: selected === code}}
            onPress={() => onSelect(code)}
            style={[
              styles.currencyCard,
              {
                borderColor: selected === code ? colors.primary : colors.border,
                borderWidth: selected === code ? 2 : 1,
                borderRadius: radius.md,
                backgroundColor: selected === code ? colors.primaryLight + '15' : colors.surfaceElevated,
                width: (screenW - 32 - 30) / 4,
              },
            ]}
          >
            <Text
              style={[
                styles.currencyCode,
                {color: selected === code ? colors.primary : colors.text},
              ]}
            >
              {code}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

function NotificationStep({
  enabled,
  isListenerOn,
  isChecking,
  listenerStatusLabel,
  onToggle,
  colors,
  radius,
}: {
  enabled: boolean;
  isListenerOn: boolean;
  isChecking: boolean;
  listenerStatusLabel: string;
  onToggle: (v: boolean) => void;
  colors: any;
  radius: any;
}) {
  return (
    <View style={styles.stepContent}>
      <Animated.Text
        entering={FadeInUp.delay(100).duration(300)}
        style={[styles.stepTitle, {color: colors.text}]}
      >
        Auto-detect transactions
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(300)}
        style={[styles.stepSubtitle, {color: colors.textSecondary}]}
      >
        When enabled, WalletPulse can read notifications from supported finance apps on this device. Parsed amounts and details are saved to your WalletPulse account like other transactions.
      </Animated.Text>

      <Animated.View
        entering={FadeIn.delay(300).duration(300)}
        style={[
          styles.notifCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        <View style={styles.notifRow}>
          <View style={{flex: 1, gap: 4}}>
            <Text style={[styles.notifTitle, {color: colors.text}]}>
              Enable notification listener
            </Text>
            <Text style={[styles.notifDesc, {color: colors.textSecondary}]}>
              {isChecking ? 'Checking access…' : listenerStatusLabel}
            </Text>
            <Text style={[styles.notifDesc, {color: colors.textSecondary}]}>
              Supported: Payoneer, Grey, Dukascopy. More apps can use custom parsing rules in Settings.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Enable notification listener"
            value={enabled && isListenerOn}
            onValueChange={onToggle}
            thumbColor={enabled && isListenerOn ? colors.primary : colors.border}
            trackColor={{false: colors.borderLight, true: colors.primaryLight}}
          />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(500).duration(300)}
        style={[styles.privacyNote, {backgroundColor: colors.successLight, borderRadius: radius.md}]}
      >
        <AppIcon name="lock-outline" size={16} color={colors.success} />
        <Text style={[styles.privacyText, {color: colors.text}]}>
          Notification text is processed on your phone to extract transactions. Your ledger syncs securely to your account when you are online.
        </Text>
      </Animated.View>
    </View>
  );
}

function AppsStep({
  selectedIds,
  onTogglePackage,
  notificationsIntentOn,
  colors,
  radius,
}: {
  selectedIds: string[];
  onTogglePackage: (packageId: string) => void;
  notificationsIntentOn: boolean;
  colors: any;
  radius: any;
}) {
  return (
    <View style={styles.stepContent}>
      <Animated.Text
        entering={FadeInUp.delay(100).duration(300)}
        style={[styles.stepTitle, {color: colors.text}]}
      >
        Which apps to watch
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(300)}
        style={[styles.stepSubtitle, {color: colors.textSecondary}]}
      >
        {notificationsIntentOn
          ? 'Turn off apps you do not want auto-detected from. You can change this later in Settings.'
          : 'Auto-detect is off. You can still enable these later when you turn on the notification listener.'}
      </Animated.Text>
      <View style={{gap: APP_ROW_GAP, marginTop: 8}}>
        {BUILTIN_MONITORED_FINANCE_APPS.map((app) => {
          const on = selectedIds.includes(app.packageId);
          return (
            <View
              key={app.packageId}
              style={[
                styles.notifCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  marginTop: 0,
                },
              ]}
            >
              <View style={styles.notifRow}>
                <Text style={[styles.notifTitle, {color: colors.text, flex: 1}]}>{app.label}</Text>
                <Switch
                  accessibilityLabel={`Monitor ${app.label}`}
                  value={on}
                  disabled={!notificationsIntentOn}
                  onValueChange={() => onTogglePackage(app.packageId)}
                  thumbColor={on ? colors.primary : colors.border}
                  trackColor={{false: colors.borderLight, true: colors.primaryLight}}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function CategoriesPreviewStep({colors, radius}: {colors: any; radius: any}) {
  const preview = DEFAULT_CATEGORIES.slice(0, PREVIEW_CATEGORY_COUNT);
  return (
    <View style={styles.stepContent}>
      <Animated.Text
        entering={FadeInUp.delay(100).duration(300)}
        style={[styles.stepTitle, {color: colors.text}]}
      >
        Default categories
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(300)}
        style={[styles.stepSubtitle, {color: colors.textSecondary}]}
      >
        We will add a starter set of categories so you can log expenses right away. Rename, hide, or add more under Settings anytime.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(300).duration(300)} style={{gap: 10, marginTop: 8}}>
        {preview.map((cat, idx) => (
          <Animated.View
            key={cat.name}
            entering={FadeInDown.delay(350 + idx * 60).duration(250)}
            style={[
              styles.categoryPreviewRow,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            <View style={[styles.categoryColorDot, {backgroundColor: cat.color}]} />
            <Text style={[styles.featureLabel, {color: colors.text}]}>{cat.name}</Text>
          </Animated.View>
        ))}
        <Text style={[styles.notifDesc, {color: colors.textTertiary, marginTop: 4}]}>
          Plus more categories for income, transfers, and day-to-day spending.
        </Text>
      </Animated.View>
    </View>
  );
}

const READY_FEATURES = [
  {icon: 'wallet-outline', label: 'Wallets and budgets'},
  {icon: 'chart-bar', label: 'Analytics and spending reports'},
  {icon: 'export', label: 'CSV, JSON, and PDF export'},
  {icon: 'star-outline', label: 'Financial Health Score'},
];

function CompleteStep({colors, onGetStarted}: {colors: any; onGetStarted: () => void}) {
  return (
    <View style={styles.stepContent}>
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.iconCircle}>
        <AppIcon name="check-circle-outline" size={64} color={colors.primary} />
      </Animated.View>
      <Animated.Text
        entering={FadeInUp.delay(300).duration(400)}
        style={[styles.heroTitle, {color: colors.text}]}
      >
        You are all set!
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(400).duration(400)}
        style={[styles.heroSubtitle, {color: colors.textSecondary}]}
      >
        WalletPulse is free. Explore wallets, budgets, exports, and insights whenever you are ready.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.featureList}>
        {READY_FEATURES.map((f, idx) => (
          <Animated.View
            key={f.label}
            entering={FadeInDown.delay(600 + idx * 100).duration(300)}
            style={styles.featureRow}
          >
            <View style={[styles.featureDot, {backgroundColor: colors.primary + '33'}]}>
              <AppIcon name={f.icon} size={14} color={colors.primary} />
            </View>
            <Text style={[styles.featureLabel, {color: colors.text}]}>{f.label}</Text>
          </Animated.View>
        ))}
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(1000).duration(300)} style={styles.trialActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onGetStarted}
          style={({pressed}) => [
            styles.trialBtn,
            {backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1, borderRadius: 12},
          ]}
        >
          <Text style={[styles.trialBtnText, {color: '#FFFFFF'}]}>Get started</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const steps = useMemo(() => getOnboardingSteps(), []);
  const pageScrollRef = useRef<ScrollView>(null);
  const currentStepRef = useRef(0);
  const [pageWidth, setPageWidth] = useState(() => Dimensions.get('window').width);

  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const setBaseCurrency = useAppStore((s) => s.setBaseCurrency);

  const {
    isEnabled: isListenerEnabledFlag,
    isChecking: isListenerChecking,
    checkPermission,
    requestPermission,
    startListening,
    stopListening,
  } = useNotificationListener();

  const [currentStep, setCurrentStep] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [monitoredAppPackageIds, setMonitoredAppPackageIds] = useState<string[]>(() => [
    ...DEFAULT_MONITORED_APP_PACKAGE_IDS,
  ]);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({window}) => {
      setPageWidth(window.width);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const state: OnboardingState = useMemo(
    () => ({currency, enableNotifications, monitoredAppPackageIds}),
    [currency, enableNotifications, monitoredAppPackageIds],
  );

  const listenerStatusLabel = useMemo(() => {
    if (!isListenerEnabledFlag) {
      return 'Open Android settings to allow notification access for WalletPulse.';
    }
    return 'Notification access granted for this device.';
  }, [isListenerEnabledFlag]);

  const handleNotificationToggle = useCallback(
    (val: boolean) => {
      if (val) {
        if (!isListenerEnabledFlag) {
          Alert.alert(
            'Permission required',
            'WalletPulse needs notification listener access to auto-detect transactions. You will be sent to Android settings.',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Open settings', onPress: () => void requestPermission()},
            ],
          );
          return;
        }
        startListening();
        setEnableNotifications(true);
        return;
      }
      stopListening();
      setEnableNotifications(false);
    },
    [isListenerEnabledFlag, requestPermission, startListening, stopListening],
  );

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  const toggleMonitoredApp = useCallback((packageId: string) => {
    setMonitoredAppPackageIds((prev) =>
      prev.includes(packageId) ? prev.filter((id) => id !== packageId) : [...prev, packageId],
    );
    setStepError(null);
  }, []);

  const scrollToStep = useCallback(
    (index: number) => {
      pageScrollRef.current?.scrollTo({x: index * pageWidth, animated: true});
      setCurrentStep(index);
    },
    [pageWidth],
  );

  const canGoNext = currentStep < steps.length - 1;
  const isCompleteStep = steps[currentStep]?.id === 'complete';

  const handleNext = useCallback(() => {
    const err = validateOnboardingStep(steps[currentStep].id, state);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (canGoNext) {
      scrollToStep(currentStep + 1);
    }
  }, [currentStep, steps, state, canGoNext, scrollToStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setStepError(null);
      scrollToStep(currentStep - 1);
    }
  }, [currentStep, scrollToStep]);

  const applyCompletionPrefs = useCallback(() => {
    const code = normalizeOnboardingCurrencyCode(currency);
    useSettingsStore.getState().setOnboardingCurrency(code);
    setBaseCurrency(code);
    useSettingsStore.getState().setMonitoredAppPackageIds(monitoredAppPackageIds);
  }, [currency, monitoredAppPackageIds, setBaseCurrency]);

  const handleFinish = useCallback(async () => {
    const err = validateOnboardingStep(steps[currentStep].id, state);
    if (err) {
      setStepError(err);
      return;
    }
    const effectiveNotif = enableNotifications && isListenerEnabledFlag;
    useSettingsStore.getState().setNotificationEnabled(effectiveNotif);
    applyCompletionPrefs();
    setOnboardingCompleted(true);
  }, [
    applyCompletionPrefs,
    currentStep,
    enableNotifications,
    isListenerEnabledFlag,
    setOnboardingCompleted,
    state,
    steps,
  ]);

  const handleSkip = useCallback(async () => {
    stopListening();
    const code = normalizeOnboardingCurrencyCode(currency);
    useSettingsStore.getState().setOnboardingCurrency(code);
    setBaseCurrency(code);
    useSettingsStore.getState().setMonitoredAppPackageIds(monitoredAppPackageIds);
    useSettingsStore.getState().setNotificationEnabled(false);
    setOnboardingCompleted(true);
  }, [currency, monitoredAppPackageIds, setBaseCurrency, setOnboardingCompleted, stopListening]);

  const onPagerScrollEnd = useCallback(
    (e: {nativeEvent: {contentOffset: {x: number}}}) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / pageWidth);
      const clamped = Math.max(0, Math.min(idx, steps.length - 1));
      const prev = currentStepRef.current;
      if (clamped > prev) {
        const err = validateOnboardingStep(steps[prev].id, state);
        if (err) {
          setStepError(err);
          pageScrollRef.current?.scrollTo({x: prev * pageWidth, animated: true});
          return;
        }
        setStepError(null);
      }
      setCurrentStep(clamped);
    },
    [pageWidth, state, steps],
  );

  const layoutStepRef = useRef(currentStep);
  layoutStepRef.current = currentStep;

  useEffect(() => {
    pageScrollRef.current?.scrollTo({
      x: layoutStepRef.current * pageWidth,
      animated: false,
    });
  }, [pageWidth]);

  const progressWidth = ((currentStep + 1) / steps.length) * 100;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View style={[styles.progressTrack, {backgroundColor: colors.border, marginTop: insets.top}]}>
        <Animated.View
          style={[
            styles.progressFill,
            {backgroundColor: colors.primary, width: `${progressWidth}%`},
          ]}
        />
      </View>

      <View style={[styles.header, {paddingHorizontal: spacing.base}]}>
        {currentStep > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            hitSlop={12}
          >
            <Text style={[styles.headerAction, {color: colors.primary}]}>Back</Text>
          </Pressable>
        ) : (
          <View style={{width: 48}} />
        )}

        <StepIndicator total={steps.length} current={currentStep} colors={colors} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          onPress={handleSkip}
          hitSlop={12}
        >
          <Text style={[styles.headerAction, {color: colors.textTertiary}]}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={pageScrollRef}
        horizontal
        pagingEnabled
        style={styles.pager}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerScrollEnd}
        scrollEventThrottle={16}
      >
        {steps.map((step) => (
            <ScrollView
            key={step.id}
            style={[styles.pageScroll, {width: pageWidth}]}
            contentContainerStyle={[
              styles.scrollContent,
              {paddingHorizontal: spacing.base, paddingBottom: 120},
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step.id === 'welcome' && <WelcomeStep colors={colors} />}
            {step.id === 'currency' && (
              <CurrencyStep
                selected={currency}
                onSelect={(c) => {
                  setCurrency(c);
                  setStepError(null);
                }}
                colors={colors}
                radius={radius}
              />
            )}
            {step.id === 'notifications' && (
              <NotificationStep
                enabled={enableNotifications}
                isListenerOn={isListenerEnabledFlag}
                isChecking={isListenerChecking}
                listenerStatusLabel={listenerStatusLabel}
                onToggle={handleNotificationToggle}
                colors={colors}
                radius={radius}
              />
            )}
            {step.id === 'apps' && (
              <AppsStep
                selectedIds={monitoredAppPackageIds}
                onTogglePackage={toggleMonitoredApp}
                notificationsIntentOn={enableNotifications && isListenerEnabledFlag}
                colors={colors}
                radius={radius}
              />
            )}
            {step.id === 'categories' && <CategoriesPreviewStep colors={colors} radius={radius} />}
            {step.id === 'complete' && (
              <CompleteStep colors={colors} onGetStarted={handleFinish} />
            )}
          </ScrollView>
        ))}
      </ScrollView>

      {!isCompleteStep && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingHorizontal: spacing.base,
              paddingBottom: insets.bottom + spacing.base,
              backgroundColor: colors.background,
            },
          ]}
        >
          {stepError && (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[styles.errorText, {color: colors.danger}]}
            >
              {stepError}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={handleNext}
            style={({pressed}) => [
              styles.ctaBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaText, {color: '#FFFFFF'}]}>Continue</Text>
          </Pressable>

          <Text style={[styles.stepLabel, {color: colors.textTertiary}]}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageScroll: {
    flex: 1,
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerAction: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    minWidth: 48,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContent: {
    gap: 16,
    paddingTop: 8,
  },
  iconCircle: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  featureList: {
    gap: 12,
    marginTop: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  currencyCard: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '700',
  },
  notifCard: {
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  notifDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  categoryPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomBar: {
    gap: 8,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  ctaBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  stepLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  trialActions: {
    gap: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  trialBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  trialBtnText: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
});
