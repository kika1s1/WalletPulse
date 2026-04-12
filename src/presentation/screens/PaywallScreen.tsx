import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {useEntitlement} from '@presentation/hooks/useEntitlement';
import {usePurchase} from '@presentation/hooks/usePurchase';
import {PlanCard} from '@presentation/components/common/PlanCard';
import type {WalletPulsePlanId} from '@shared/constants/purchase-constants';
import {monetizationAnalytics} from '@infrastructure/analytics/monetization-events';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const PRO_FEATURES = [
  'Unlimited wallets',
  'All bank parsers',
  'Advanced analytics and insights',
  'CSV, Excel, and PDF export',
  'Financial Health Score',
  'Goals, budgets, and bill reminders',
  'Subscription tracking',
  'Dark mode and biometric lock',
];

type PlanConfig = {
  planId: WalletPulsePlanId;
  tierLabel: string;
  features: string[];
  isRecommended: boolean;
};

const PLAN_CONFIGS: PlanConfig[] = [
  {
    planId: 'monthly',
    tierLabel: 'Monthly',
    features: [
      'All Pro features',
      'Cancel anytime',
      'Flexible monthly billing',
    ],
    isRecommended: false,
  },
  {
    planId: 'yearly',
    tierLabel: 'Yearly',
    features: [
      'All Pro features',
      'Best value plan',
      'Save compared to monthly',
    ],
    isRecommended: true,
  },
  {
    planId: 'lifetime',
    tierLabel: 'Lifetime',
    features: [
      'All Pro features forever',
      'One-time payment',
      'No recurring charges',
    ],
    isRecommended: false,
  },
];

export default function PaywallScreen({navigation, route}: Props) {
  const {colors, spacing, typography: typo, radius} = useTheme();
  const {tier, currentPlanId, availablePackages} = useEntitlement();
  const {isPurchasing, error, purchase, restore, clearError} = usePurchase();
  const [purchasingPlanId, setPurchasingPlanId] = useState<WalletPulsePlanId | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const openedAt = useRef(Date.now());
  const source = route.params?.source ?? 'unknown';

  useEffect(() => {
    void monetizationAnalytics.trackPaywallViewed(source, tier);
  }, [source, tier]);

  const priceMap = useMemo(() => {
    const map: Partial<Record<WalletPulsePlanId, string>> = {};
    for (const pkg of availablePackages) {
      map[pkg.planId] = pkg.product.priceString;
    }
    return map;
  }, [availablePackages]);

  const handleSelectPlan = useCallback(
    async (planId: WalletPulsePlanId) => {
      clearError();
      setPurchasingPlanId(planId);
      const success = await purchase(planId);
      setPurchasingPlanId(null);
      if (success) {
        void monetizationAnalytics.trackPurchaseCompleted(planId, 0, tier);
        navigation.goBack();
      } else {
        void monetizationAnalytics.trackPurchaseFailed(planId, 'purchase_cancelled_or_failed');
      }
    },
    [clearError, purchase, navigation, tier],
  );

  const handleRestore = useCallback(async () => {
    clearError();
    setIsRestoring(true);
    await restore();
    setIsRestoring(false);
  }, [clearError, restore]);

  const handleClose = useCallback(() => {
    const duration = Date.now() - openedAt.current;
    void monetizationAnalytics.trackPaywallDismissed(source, duration);
    navigation.goBack();
  }, [navigation, source]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: colors.background}]}
      edges={['top', 'bottom']}>
      <View style={[styles.header, {paddingHorizontal: spacing.base}]}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          accessibilityLabel="Close paywall"
          accessibilityRole="button"
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          onPress={handleClose}
          testID="paywall-close-btn">
          <Icon name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {paddingHorizontal: spacing.base, paddingBottom: spacing['3xl']},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, {marginTop: spacing.lg}]}>
          <View
            style={[
              styles.logoCircle,
              {backgroundColor: `${colors.primary}1A`},
            ]}>
            <Icon name="wallet-outline" size={40} color={colors.primary} />
          </View>
          <Text
            style={[
              typo.title1,
              {color: colors.text, textAlign: 'center', marginTop: spacing.md},
            ]}>
            Unlock Your Financial Power
          </Text>
          <Text
            style={[
              typo.body,
              {
                color: colors.textSecondary,
                textAlign: 'center',
                marginTop: spacing.xs,
              },
            ]}>
            Track every currency. Automate every transaction.
          </Text>
        </View>

        <View style={[styles.featureList, {marginTop: spacing.xl}]}>
          {PRO_FEATURES.map((feat) => (
            <View key={feat} style={styles.featureItem}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text
                style={[
                  typo.body,
                  {color: colors.text, marginLeft: spacing.sm, flex: 1},
                ]}>
                {feat}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.plans, {marginTop: spacing['2xl'], gap: spacing.md}]}>
          {PLAN_CONFIGS.map((config) => {
            const price = priceMap[config.planId];
            const periodLabel =
              config.planId === 'lifetime'
                ? 'one time'
                : config.planId === 'yearly'
                  ? '/ year'
                  : '/ month';

            return (
              <PlanCard
                key={config.planId}
                tierLabel={config.tierLabel}
                price={price ?? '...'}
                periodLabel={periodLabel}
                features={config.features}
                isRecommended={config.isRecommended}
                isCurrentPlan={currentPlanId === config.planId}
                onSelect={() => void handleSelectPlan(config.planId)}
                disabled={
                  isPurchasing || currentPlanId === config.planId
                }
                loading={purchasingPlanId === config.planId}
                savingsLabel={
                  config.planId === 'yearly' ? 'Save 33%' : null
                }
              />
            );
          })}
        </View>

        {error && (
          <View
            style={[
              styles.errorContainer,
              {
                backgroundColor: colors.dangerLight,
                borderRadius: radius.sm,
                marginTop: spacing.md,
                padding: spacing.sm,
              },
            ]}>
            <Text style={[typo.footnote, {color: colors.danger, textAlign: 'center'}]}>
              {error}
            </Text>
          </View>
        )}

        {(isPurchasing || isRestoring) && (
          <View style={[styles.loadingRow, {marginTop: spacing.md}]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              style={[
                typo.footnote,
                {color: colors.textSecondary, marginLeft: spacing.sm},
              ]}>
              {isRestoring ? 'Restoring purchases...' : 'Processing purchase...'}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.trustFooter,
            {marginTop: spacing['2xl'], gap: spacing.sm},
          ]}>
          <View style={styles.trustRow}>
            <Icon name="shield-check-outline" size={16} color={colors.textTertiary} />
            <Text style={[typo.caption, {color: colors.textTertiary, marginLeft: 4}]}>
              No data leaves your device
            </Text>
          </View>
          <View style={styles.trustRow}>
            <Icon name="calendar-remove-outline" size={16} color={colors.textTertiary} />
            <Text style={[typo.caption, {color: colors.textTertiary, marginLeft: 4}]}>
              Cancel anytime
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
            testID="paywall-restore-btn"
            style={styles.trustRow}>
            <Icon name="restore" size={16} color={colors.primary} />
            <Text
              style={[
                typo.caption,
                {color: colors.primary, marginLeft: 4, fontWeight: '600'},
              ]}>
              Restore purchases
            </Text>
          </TouchableOpacity>
        </View>

        {tier !== 'free' && (
          <Text
            style={[
              typo.caption,
              {
                color: colors.textTertiary,
                textAlign: 'center',
                marginTop: spacing.md,
              },
            ]}>
            You are currently on the {tier.charAt(0).toUpperCase() + tier.slice(1)} plan
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: 44,
  },
  headerSpacer: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plans: {},
  errorContainer: {},
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustFooter: {
    alignItems: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
