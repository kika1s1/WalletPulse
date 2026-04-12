import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {FeatureLimits, Tier} from '@domain/entities/Entitlement';
import {VALID_TIERS} from '@domain/entities/Entitlement';
import {getTierLimits} from '@domain/entities/tier-config';
import {IAP_PRODUCTS} from '@shared/constants/iap-products';
import {AFFILIATE_PARTNERS} from '@shared/constants/affiliate-links';
import {useEntitlement} from '@presentation/hooks/useEntitlement';
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';
import {
  MonetizationAnalytics,
  monetizationAnalytics,
} from '@infrastructure/analytics/monetization-events';
import type {MonetizationEvent} from '@infrastructure/analytics/analytics-types';
import {CheckPaywallTrigger} from '@domain/usecases/check-paywall-trigger';
import {useTheme} from '@shared/theme';
import {BackButton} from '@presentation/components/common';
import {fontWeight} from '@shared/theme/typography';

const FEATURE_KEYS: (keyof FeatureLimits)[] = [
  'maxWallets', 'maxBudgets', 'maxParserApps', 'historyMonths',
  'customCategories', 'export', 'darkMode', 'biometricLock', 'encryption',
  'goals', 'subscriptionTracking', 'billReminders', 'templates', 'receipts',
  'tags', 'savedFilters', 'financialHealthScore', 'paydayPlanner',
  'spendingAutopsy', 'backup', 'insights', 'multiProfile', 'taxCategories',
  'taxEstimate', 'invoiceTracking', 'profitLoss', 'clientExpenses',
  'professionalReports', 'googleDriveBackup', 'scheduledExports',
  'currencyGainLoss', 'spendingPredictions', 'customParsers', 'homeWidgets',
  'splitExpenses', 'moneyLostTracker', 'currencyTimingAdvisor',
  'freelancerDashboard', 'billNegotiationAlerts',
];

const TRIGGER_EVENTS = [
  'wallet_limit_reached',
  'export_attempted',
  'month_end',
  'notification_overflow',
  'budget_limit_reached',
  'goal_created',
  'subscription_added',
  'bill_added',
  'template_created',
];

export default function MonetizationDebugScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const ent = useEntitlement();
  const [events, setEvents] = useState<MonetizationEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'features' | 'iap' | 'triggers' | 'events'>('features');

  const loadEvents = useCallback(async () => {
    const data = await monetizationAnalytics.getEvents();
    setEvents(data);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const simulateTier = useCallback((tier: Tier) => {
    const limits = getTierLimits(tier);
    useEntitlementStore.setState({
      entitlement: {
        id: `debug-${tier}`,
        tier,
        featureLimits: limits,
        isTrialing: false,
        trialEndsAt: null,
        expiresAt: null,
        purchasedAt: tier !== 'free' ? Date.now() : null,
      },
    });
    Alert.alert('Tier Changed', `Simulated tier: ${tier}`);
  }, []);

  const handleClearEvents = useCallback(async () => {
    await monetizationAnalytics.clearEvents();
    setEvents([]);
  }, []);

  const featureValue = useCallback(
    (key: keyof FeatureLimits) => {
      const val = ent.entitlement.featureLimits[key];
      if (typeof val === 'boolean') {
        return val;
      }
      if (typeof val === 'number') {
        return val === Infinity ? 'unlimited' : val;
      }
      return val;
    },
    [ent.entitlement.featureLimits],
  );

  const renderFeatureRow = useCallback(
    ({item}: {item: keyof FeatureLimits}) => {
      const val = featureValue(item);
      const isBool = typeof val === 'boolean';
      const isGranted = isBool ? val : true;

      return (
        <View
          style={[
            styles.row,
            {borderBottomColor: colors.borderLight, paddingVertical: spacing.xs},
          ]}
        >
          <Icon
            name={isGranted ? 'check-circle' : 'close-circle'}
            size={16}
            color={isGranted ? colors.success : colors.danger}
          />
          <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
            {item}
          </Text>
          <Text style={[typo.caption, {color: colors.textSecondary}]}>
            {String(val)}
          </Text>
        </View>
      );
    },
    [colors, spacing, typo, featureValue],
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {padding: spacing.base}]}>
        <BackButton />
        <Text style={[typo.title3, {color: colors.text}]}>
          Monetization Debug
        </Text>
        <View style={{width: 32}} />
      </View>

      {/* Current tier */}
      <View style={[styles.tierBar, {backgroundColor: colors.surfaceElevated, padding: spacing.sm, marginHorizontal: spacing.base, borderRadius: radius.md}]}>
        <Text style={[typo.footnote, {color: colors.textSecondary}]}>
          Current tier:
        </Text>
        <Text style={[styles.tierLabel, {color: colors.primary}]}>
          {ent.tier.toUpperCase()}
        </Text>
        <Text style={[typo.caption, {color: colors.textTertiary}]}>
          {ent.isTrialing ? 'Trialing' : ''} {ent.appUserId ? `(${ent.appUserId})` : ''}
        </Text>
      </View>

      {/* Simulate tier buttons */}
      <View style={[styles.simRow, {padding: spacing.base, gap: spacing.xs}]}>
        {VALID_TIERS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => simulateTier(t)}
            style={[
              styles.simBtn,
              {
                backgroundColor: ent.tier === t ? colors.primary : colors.surfaceElevated,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <Text
              style={[
                typo.caption,
                {color: ent.tier === t ? colors.background : colors.text},
              ]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, {borderBottomColor: colors.borderLight, paddingHorizontal: spacing.base}]}>
        {(['features', 'iap', 'triggers', 'events'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              if (tab === 'events') {
                loadEvents();
              }
            }}
            style={[
              styles.tab,
              {
                borderBottomColor: activeTab === tab ? colors.primary : 'transparent',
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <Text
              style={[
                typo.caption,
                {color: activeTab === tab ? colors.primary : colors.textSecondary},
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'features' && (
        <FlatList
          data={FEATURE_KEYS}
          keyExtractor={(i) => i}
          renderItem={renderFeatureRow}
          contentContainerStyle={{padding: spacing.base}}
        />
      )}

      {activeTab === 'iap' && (
        <ScrollView contentContainerStyle={{padding: spacing.base, gap: spacing.xs}}>
          <Text style={[typo.footnote, {color: colors.textSecondary, marginBottom: spacing.xs}]}>
            {IAP_PRODUCTS.length} products registered
          </Text>
          {IAP_PRODUCTS.map((p) => (
            <View
              key={p.id}
              style={[styles.iapRow, {borderBottomColor: colors.borderLight, paddingVertical: spacing.xs}]}
            >
              <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
                {p.name}
              </Text>
              <Text style={[typo.caption, {color: colors.textTertiary}]}>
                {p.category} / {p.price}
              </Text>
            </View>
          ))}
          <Text style={[typo.footnote, {color: colors.textSecondary, marginTop: spacing.md}]}>
            Affiliates: {AFFILIATE_PARTNERS.length} partners
          </Text>
          {AFFILIATE_PARTNERS.map((a) => (
            <View
              key={a.id}
              style={[styles.iapRow, {borderBottomColor: colors.borderLight, paddingVertical: spacing.xs}]}
            >
              <Icon name={a.icon} size={16} color={colors.textSecondary} />
              <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
                {a.name}
              </Text>
              <Text style={[typo.caption, {color: colors.textTertiary}]}>
                {a.contextTrigger}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'triggers' && (
        <ScrollView contentContainerStyle={{padding: spacing.base, gap: spacing.sm}}>
          <Text style={[typo.footnote, {color: colors.textSecondary, marginBottom: spacing.xs}]}>
            Tap to test each paywall trigger:
          </Text>
          {TRIGGER_EVENTS.map((evt) => {
            const checker = new CheckPaywallTrigger();
            const trigger = checker.shouldTrigger(evt, {
              currentCount: 3,
              limit: 2,
              currentTier: ent.tier,
            });
            return (
              <TouchableOpacity
                key={evt}
                style={[
                  styles.triggerRow,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                  },
                ]}
                onPress={() =>
                  Alert.alert(
                    trigger ? 'Trigger Fired' : 'No Trigger',
                    trigger
                      ? `${trigger.title}\nTarget: ${trigger.targetTier}\nFeature: ${trigger.feature}`
                      : `No trigger for "${evt}" with current context.`,
                  )
                }
              >
                <Icon
                  name={trigger ? 'bell-ring' : 'bell-off-outline'}
                  size={16}
                  color={trigger ? colors.warning : colors.textTertiary}
                />
                <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
                  {evt}
                </Text>
                <Text style={[typo.caption, {color: trigger ? colors.success : colors.textTertiary}]}>
                  {trigger ? 'fires' : 'silent'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {activeTab === 'events' && (
        <View style={{flex: 1}}>
          <View style={[styles.eventsHeader, {padding: spacing.base, paddingBottom: spacing.xs}]}>
            <Text style={[typo.footnote, {color: colors.textSecondary}]}>
              {events.length} events logged
            </Text>
            <TouchableOpacity onPress={handleClearEvents}>
              <Text style={[typo.caption, {color: colors.danger}]}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={events.slice().reverse()}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{padding: spacing.base, paddingTop: 0}}
            renderItem={({item}) => (
              <View
                style={[
                  styles.eventRow,
                  {borderBottomColor: colors.borderLight, paddingVertical: spacing.xs},
                ]}
              >
                <Text style={[typo.caption, {color: colors.primary}]}>
                  {item.type}
                </Text>
                <Text style={[typo.caption, {color: colors.textTertiary}]}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
  simRow: {
    flexDirection: 'row',
  },
  simBtn: {
    alignItems: 'center' as const,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    gap: 16,
  },
  tab: {
    borderBottomWidth: 2,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
