import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {WalletPulsePlanId} from '@shared/constants/purchase-constants';
import {BackButton, Badge, Button, Card} from '@presentation/components/common';
import {useEntitlement} from '@presentation/hooks/useEntitlement';
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) {
    return 'Not available';
  }

  return new Date(timestamp).toLocaleDateString();
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const {colors} = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, {color: colors.textTertiary}]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, {color: colors.text}]}>
        {value}
      </Text>
    </View>
  );
}

export default function ManageSubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, typography} = useTheme();
  const {
    appUserId,
    availablePackages,
    currentPlanId,
    currentPlanLabel,
    customerInfo,
    error,
    expiresAt,
    hasWalletPulsePro,
    isBusy,
    isLoading,
    isTrialing,
    managementUrl,
    tier,
  } = useEntitlement();
  const clearError = useEntitlementStore((state) => state.clearError);
  const openCustomerCenter = useEntitlementStore(
    (state) => state.openCustomerCenter,
  );
  const presentPaywall = useEntitlementStore((state) => state.presentPaywall);
  const purchasePlan = useEntitlementStore((state) => state.purchasePlan);
  const restorePurchases = useEntitlementStore(
    (state) => state.restorePurchases,
  );

  const handleOpenManagementUrl = useCallback(async () => {
    if (!managementUrl) {
      Alert.alert(
        'Management link unavailable',
        'RevenueCat has not provided a subscription management URL for this customer yet.',
      );
      return;
    }

    const supported = await Linking.canOpenURL(managementUrl);
    if (!supported) {
      Alert.alert('Cannot open link', managementUrl);
      return;
    }

    await Linking.openURL(managementUrl);
  }, [managementUrl]);

  const handleRestore = useCallback(async () => {
    clearError();
    const result = await restorePurchases();
    Alert.alert(
      result.success ? 'Purchases restored' : 'Restore failed',
      result.success
        ? 'Walletpulse Pro has been refreshed for this account.'
        : result.errorMessage,
    );
  }, [clearError, restorePurchases]);

  const handlePresentPaywall = useCallback(async () => {
    clearError();
    const result = await presentPaywall();
    if (result.success) {
      Alert.alert(
        result.restored ? 'Purchases restored' : 'Purchase complete',
        result.restored
          ? 'Walletpulse Pro was restored successfully.'
          : 'Walletpulse Pro is now active.',
      );
      return;
    }

    if (result.errorMessage) {
      Alert.alert('Paywall result', result.errorMessage);
    }
  }, [clearError, presentPaywall]);

  const handleOpenCustomerCenter = useCallback(async () => {
    clearError();
    const success = await openCustomerCenter();
    if (!success) {
      Alert.alert(
        'Customer Center unavailable',
        'Customer Center requires RevenueCat dashboard configuration and an eligible RevenueCat plan.',
      );
    }
  }, [clearError, openCustomerCenter]);

  const handlePurchasePlan = useCallback(
    async (planId: WalletPulsePlanId) => {
      clearError();
      const result = await purchasePlan(planId);
      Alert.alert(
        result.success ? 'Purchase complete' : 'Purchase not completed',
        result.success
          ? 'Walletpulse Pro has been activated for this account.'
          : result.errorMessage,
      );
    },
    [clearError, purchasePlan],
  );

  const statusLabel = hasWalletPulsePro
    ? isTrialing
      ? 'Trial active'
      : 'Active'
    : 'Free plan';
  const statusVariant = hasWalletPulsePro
    ? isTrialing
      ? 'warning'
      : 'success'
    : 'default';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.base,
          },
        ]}>
        <BackButton />
        <View style={styles.headerCopy}>
          <Text style={[typography.title3, {color: colors.text}]}>
            Walletpulse Pro
          </Text>
          <Text style={[styles.headerSub, {color: colors.textSecondary}]}>
            RevenueCat subscriptions, entitlement checks, and account management
          </Text>
        </View>
      </View>

      {isLoading && !customerInfo ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.base,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.base,
          }}
          showsVerticalScrollIndicator={false}>
          <Card padding="lg" elevated>
            <View style={[styles.statusRow, {marginBottom: spacing.md}]}>
              <View style={{flex: 1}}>
                <Text style={[styles.sectionEyebrow, {color: colors.textTertiary}]}>
                  Current access
                </Text>
                <Text style={[typography.title3, {color: colors.text}]}>
                  {currentPlanLabel}
                </Text>
              </View>
              <Badge label={statusLabel} variant={statusVariant} />
            </View>

            <View style={{gap: spacing.sm}}>
              <DetailRow label="Tier" value={tier} />
              <DetailRow
                label="Entitlement"
                value={hasWalletPulsePro ? 'Walletpulse Pro active' : 'Walletpulse Pro inactive'}
              />
              <DetailRow
                label="Current product"
                value={currentPlanId ?? 'No active purchase'}
              />
              <DetailRow
                label="Expires"
                value={formatTimestamp(expiresAt)}
              />
              <DetailRow
                label="RevenueCat App User ID"
                value={appUserId ?? 'Not available'}
              />
            </View>
          </Card>

          <Card padding="lg">
            <Text style={[styles.sectionTitle, {color: colors.text}]}>
              RevenueCat tools
            </Text>
            <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
              Use the native RevenueCat paywall and Customer Center when you want the fastest production-ready subscription flow.
            </Text>

            <View style={[styles.buttonStack, {marginTop: spacing.base}]}>
              <Button
                title="Open RevenueCat Paywall"
                onPress={handlePresentPaywall}
                loading={isBusy}
                fullWidth
              />
              <Button
                title="Restore Purchases"
                onPress={handleRestore}
                variant="secondary"
                loading={isBusy}
                fullWidth
              />
              <Button
                title="Open Customer Center"
                onPress={handleOpenCustomerCenter}
                variant="outline"
                loading={isBusy}
                fullWidth
              />
              <Button
                title="Manage Store Subscription"
                onPress={handleOpenManagementUrl}
                variant="ghost"
                disabled={!managementUrl || isBusy}
                fullWidth
              />
            </View>
          </Card>

          <Card padding="lg">
            <Text style={[styles.sectionTitle, {color: colors.text}]}>
              Direct plan purchase
            </Text>
            <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
              These options come from the current RevenueCat offering. Configure `monthly`, `yearly`, and `lifetime` in the dashboard and they will appear here automatically.
            </Text>

            <View style={[styles.planList, {marginTop: spacing.base}]}>
              {availablePackages.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    {
                      borderColor: colors.borderLight,
                      borderRadius: radius.lg,
                      backgroundColor: colors.surface,
                    },
                  ]}>
                  <Text style={[styles.emptyTitle, {color: colors.text}]}>
                    No RevenueCat offering found
                  </Text>
                  <Text style={[styles.emptyDescription, {color: colors.textSecondary}]}>
                    Create a current offering in RevenueCat, attach the `monthly`, `yearly`, and `lifetime` products, then reopen this screen.
                  </Text>
                </View>
              ) : (
                availablePackages.map((pkg) => {
                  const isCurrentPlan = currentPlanId === pkg.planId && hasWalletPulsePro;
                  const subtitle =
                    pkg.planId === 'lifetime'
                      ? pkg.product.priceString
                      : `${pkg.product.priceString} • ${pkg.planId}`;

                  return (
                    <View
                      key={pkg.identifier}
                      style={[
                        styles.planCard,
                        {
                          borderColor: isCurrentPlan
                            ? colors.primary
                            : colors.borderLight,
                          borderRadius: radius.lg,
                          backgroundColor: colors.surface,
                          padding: spacing.base,
                        },
                      ]}>
                      <View style={styles.statusRow}>
                        <View style={{flex: 1}}>
                          <Text style={[styles.planTitle, {color: colors.text}]}>
                            {pkg.product.title}
                          </Text>
                          <Text
                            style={[
                              styles.planSubtitle,
                              {color: colors.textSecondary},
                            ]}>
                            {subtitle}
                          </Text>
                          <Text
                            style={[
                              styles.planDescription,
                              {color: colors.textTertiary},
                            ]}>
                            {pkg.product.description}
                          </Text>
                        </View>
                        {isCurrentPlan ? (
                          <Badge label="Current" variant="info" />
                        ) : null}
                      </View>

                      <Button
                        title={
                          isCurrentPlan
                            ? 'Current plan'
                            : `Choose ${pkg.product.title}`
                        }
                        onPress={() => handlePurchasePlan(pkg.planId)}
                        disabled={isCurrentPlan || isBusy}
                        variant={isCurrentPlan ? 'secondary' : 'primary'}
                        loading={isBusy}
                        fullWidth
                        style={{marginTop: spacing.base}}
                      />
                    </View>
                  );
                })
              )}
            </View>
          </Card>

          {error ? (
            <Card padding="md">
              <Text style={[styles.errorTitle, {color: colors.danger}]}>
                RevenueCat error
              </Text>
              <Text style={[styles.errorText, {color: colors.textSecondary}]}>
                {error}
              </Text>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerSub: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  buttonStack: {
    gap: 12,
  },
  planList: {
    gap: 12,
  },
  planCard: {
    borderWidth: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
  },
  planSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  emptyState: {
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
