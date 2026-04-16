import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Input} from '@presentation/components/common';
import {Chip} from '@presentation/components/common/Chip';
import {WalletPulseLogoMark} from '@presentation/components/WalletPulseLogo';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useAppStore} from '@presentation/stores/useAppStore';
import {
  getOnboardingSteps,
  validateOnboardingStep,
  type OnboardingState,
} from '@domain/usecases/onboarding-validation';
import {POPULAR_CURRENCIES} from '@shared/constants/currencies';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const STEP_ICONS: Record<string, string> = {
  wallet: 'wallet-outline',
  currency: 'swap-horizontal-circle-outline',
  creditcard: 'credit-card-outline',
  bell: 'bell-outline',
};

function StepIndicator({total, current, colors}: {total: number; current: number; colors: any}) {
  return (
    <View style={styles.indicatorRow}>
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

function WelcomeStep({colors, typography}: any) {
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
        Your smart, offline-first expense tracker. Track spending, set budgets, and gain insights into your finances.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(600).duration(400)} style={styles.featureList}>
        {[
          {icon: 'bell-outline', label: 'Auto-detect from notifications'},
          {icon: 'swap-horizontal-circle-outline', label: 'Multi-currency support'},
          {icon: 'wifi-off', label: 'Works completely offline'},
          {icon: 'chart-bar', label: 'Budget planning and insights'},
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

function WalletStep({
  walletName,
  onChangeName,
  error,
  colors,
}: {
  walletName: string;
  onChangeName: (n: string) => void;
  error: string | null;
  colors: any;
}) {
  return (
    <View style={styles.stepContent}>
      <Animated.Text
        entering={FadeInUp.delay(100).duration(300)}
        style={[styles.stepTitle, {color: colors.text}]}
      >
        Create your first wallet
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(300)}
        style={[styles.stepSubtitle, {color: colors.textSecondary}]}
      >
        A wallet groups your transactions. Name it after your bank account, cash, or credit card.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.walletForm}>
        <Input
          label="Wallet name"
          value={walletName}
          onChangeText={onChangeName}
          placeholder="e.g. Main Bank Account"
          error={error ?? undefined}
          maxLength={30}
        />
        <View style={styles.walletSuggestions}>
          <Text style={[styles.suggestLabel, {color: colors.textTertiary}]}>Quick picks:</Text>
          <View style={styles.suggestRow}>
            {['Main Account', 'Cash', 'Savings', 'Credit Card'].map((name) => (
              <Chip
                key={name}
                label={name}
                onPress={() => onChangeName(name)}
                selected={walletName === name}
                size="sm"
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function NotificationStep({
  enabled,
  onToggle,
  colors,
  radius,
}: {
  enabled: boolean;
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
        WalletPulse can read your bank notifications and automatically log transactions.
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
              Supported: Payoneer, Grey, Dukascopy. More banks coming soon.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            thumbColor={enabled ? colors.primary : colors.border}
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
          All data stays on your device. Notifications are processed locally and never sent to any server.
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
  const {colors, spacing, radius, typography} = useTheme();
  const insets = useSafeAreaInsets();
  const steps = useMemo(() => getOnboardingSteps(), []);

  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const setBaseCurrency = useAppStore((s) => s.setBaseCurrency);

  const [currentStep, setCurrentStep] = useState(0);
  const [walletName, setWalletName] = useState('Main Account');
  const [currency, setCurrency] = useState('USD');
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const state: OnboardingState = useMemo(
    () => ({walletName, currency, enableNotifications}),
    [walletName, currency, enableNotifications],
  );

  const canGoNext = currentStep < steps.length - 1;
  const isLast = currentStep === steps.length - 1;

  const handleNext = useCallback(() => {
    const err = validateOnboardingStep(steps[currentStep].id, state);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (canGoNext) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps, state, canGoNext]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setStepError(null);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleFinish = useCallback(async () => {
    const err = validateOnboardingStep(steps[currentStep].id, state);
    if (err) {
      setStepError(err);
      return;
    }

    useSettingsStore.getState().setNotificationEnabled(enableNotifications);
    useSettingsStore.getState().setOnboardingWalletName(walletName.trim() || 'Main Account');
    useSettingsStore.getState().setOnboardingCurrency(currency.toUpperCase());
    setBaseCurrency(currency);
    setOnboardingCompleted(true);
  }, [currentStep, steps, state, walletName, currency, enableNotifications, setBaseCurrency, setOnboardingCompleted]);

  const handleSkip = useCallback(async () => {
    useSettingsStore.getState().setNotificationEnabled(false);
    setBaseCurrency('USD');
    setOnboardingCompleted(true);
  }, [setBaseCurrency, setOnboardingCompleted]);

  const progressWidth = ((currentStep + 1) / steps.length) * 100;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      {/* Progress bar */}
      <View style={[styles.progressTrack, {backgroundColor: colors.border, marginTop: insets.top}]}>
        <Animated.View
          style={[
            styles.progressFill,
            {backgroundColor: colors.primary, width: `${progressWidth}%`},
          ]}
        />
      </View>

      {/* Header */}
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

      {/* Step content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingHorizontal: spacing.base, paddingBottom: 120},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 0 && (
          <WelcomeStep colors={colors} typography={typography} />
        )}
        {currentStep === 1 && (
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
        {currentStep === 2 && (
          <WalletStep
            walletName={walletName}
            onChangeName={(n) => {
              setWalletName(n);
              setStepError(null);
            }}
            error={stepError}
            colors={colors}
          />
        )}
        {currentStep === 3 && (
          <NotificationStep
            enabled={enableNotifications}
            onToggle={setEnableNotifications}
            colors={colors}
            radius={radius}
          />
        )}
        {currentStep === 4 && (
          <CompleteStep colors={colors} onGetStarted={handleFinish} />
        )}
      </ScrollView>

      {/* Bottom CTA (hidden on final step which has its own button) */}
      {steps[currentStep]?.id !== 'complete' && (
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
          {stepError && currentStep !== 2 && (
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
            onPress={isLast ? handleFinish : handleNext}
            style={({pressed}) => [
              styles.ctaBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaText, {color: '#FFFFFF'}]}>
              {isLast ? 'Get started' : 'Continue'}
            </Text>
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
  iconBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    fontSize: 36,
    fontWeight: '700',
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
  featureDotText: {
    fontSize: 14,
    fontWeight: '700',
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
    width: (SCREEN_WIDTH - 32 - 30) / 4,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '700',
  },
  walletForm: {
    gap: 16,
    marginTop: 8,
  },
  walletSuggestions: {
    gap: 8,
  },
  suggestLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  privacyIcon: {
    fontSize: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
  trialSkip: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
    paddingVertical: 8,
  },
});
