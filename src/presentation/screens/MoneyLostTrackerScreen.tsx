import React, {useMemo} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {Spacer} from '@presentation/components/layout/Spacer';
import {BackButton, Card, PaywallGate} from '@presentation/components/common';
import {CalculateMoneyLost} from '@domain/usecases/calculate-money-lost';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useAppStore} from '@presentation/stores/useAppStore';

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function MoneyLostTrackerScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {transactions, isLoading} = useTransactions({syncWithFilterStore: false});

  const result = useMemo(() => {
    const calculator = new CalculateMoneyLost();
    const fxTxs = transactions
      .filter((t) => t.currency.toUpperCase() !== baseCurrency.toUpperCase())
      .map((t) => ({
        date: t.transactionDate,
        amount: t.amount,
        currency: t.currency,
        appliedRate: 1,
        midMarketRate: 1,
        source: t.source ?? 'manual',
      }));
    return calculator.execute({transactions: fxTxs, targetCurrency: baseCurrency});
  }, [transactions, baseCurrency]);

  return (
    <ScreenContainer>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.sm} />
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[typo.title3, {color: colors.text, flex: 1}]}>
            Money Lost Tracker
          </Text>
        </View>
        <Spacer size={spacing.base} />
      </View>

      <PaywallGate feature="moneyLostTracker" featureLabel="Money Lost Tracker">
        {isLoading && (
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl}}>
            <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading transactions" />
          </View>
        )}
        {!isLoading && (
        <ScrollView contentContainerStyle={{padding: spacing.base, paddingTop: 0}}>
          <Card padding="md">
            <View style={styles.totalRow}>
              <View style={[styles.iconCircle, {backgroundColor: `${colors.danger}1A`}]}>
                <Icon name="cash-remove" size={28} color={colors.danger} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[typo.caption, {color: colors.textSecondary}]}>
                  Total lost to FX fees
                </Text>
                <Text style={[styles.totalValue, {color: colors.danger}]}>
                  {formatCents(result.totalLost, result.currency)}
                </Text>
                <Text style={[typo.caption, {color: colors.textTertiary}]}>
                  across {result.transactionCount} conversions
                </Text>
              </View>
            </View>
          </Card>

          {result.worstTransaction && (
            <>
              <Spacer size={spacing.md} />
              <Card padding="md">
                <Text style={[typo.footnote, {color: colors.textSecondary}]}>
                  Worst single transaction
                </Text>
                <View style={[styles.worstRow, {marginTop: spacing.xs}]}>
                  <Text style={[styles.worstSource, {color: colors.text}]}>
                    {result.worstTransaction.source}
                  </Text>
                  <Text style={[styles.worstLoss, {color: colors.danger}]}>
                    -{formatCents(result.worstTransaction.lostAmount, result.currency)}
                  </Text>
                </View>
                <Text style={[typo.caption, {color: colors.textTertiary}]}>
                  {new Date(result.worstTransaction.date).toLocaleDateString()}
                </Text>
              </Card>
            </>
          )}

          {result.bySource.length > 0 && (
            <>
              <Spacer size={spacing.md} />
              <Text style={[typo.footnote, {color: colors.textSecondary, marginBottom: spacing.xs}]}>
                Loss by source
              </Text>
              {result.bySource.map((src) => (
                <View
                  key={src.source}
                  style={[
                    styles.sourceRow,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                      marginBottom: spacing.xs,
                    },
                  ]}
                >
                  <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
                    {src.source}
                  </Text>
                  <Text style={[typo.footnote, {color: colors.danger}]}>
                    -{formatCents(src.totalLost, result.currency)}
                  </Text>
                  <Text style={[typo.caption, {color: colors.textTertiary, marginLeft: 8}]}>
                    {src.count} txns
                  </Text>
                </View>
              ))}
            </>
          )}

          {result.byMonth.length > 0 && (
            <>
              <Spacer size={spacing.md} />
              <Text style={[typo.footnote, {color: colors.textSecondary, marginBottom: spacing.xs}]}>
                Loss by month
              </Text>
              {result.byMonth.map((m) => (
                <View
                  key={m.month}
                  style={[
                    styles.sourceRow,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                      marginBottom: spacing.xs,
                    },
                  ]}
                >
                  <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
                    {m.month}
                  </Text>
                  <Text style={[typo.footnote, {color: colors.danger}]}>
                    -{formatCents(m.totalLost, result.currency)}
                  </Text>
                </View>
              ))}
            </>
          )}

          <Spacer size={spacing.md} />
          <Card padding="md" style={{backgroundColor: `${colors.primary}08`}}>
            <View style={styles.tipRow}>
              <Icon name="lightbulb-outline" size={20} color={colors.primary} />
              <Text style={[typo.footnote, {color: colors.textSecondary, flex: 1}]}>
                {result.savingsTip}
              </Text>
            </View>
          </Card>
          <Spacer size={spacing.xl} />
        </ScrollView>
        )}
      </PaywallGate>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {alignSelf: 'stretch'},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  totalRow: {flexDirection: 'row', alignItems: 'center', gap: 14},
  iconCircle: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  totalValue: {fontSize: 24, fontWeight: fontWeight.bold},
  worstRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  worstSource: {fontSize: 15, fontWeight: fontWeight.semibold},
  worstLoss: {fontSize: 15, fontWeight: fontWeight.bold},
  sourceRow: {flexDirection: 'row', alignItems: 'center'},
  tipRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
});
