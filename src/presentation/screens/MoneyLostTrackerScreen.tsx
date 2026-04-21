import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {Spacer} from '@presentation/components/layout/Spacer';
import {BackButton, Card} from '@presentation/components/common';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {CalculateMoneyLost} from '@domain/usecases/calculate-money-lost';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useAppStore} from '@presentation/stores/useAppStore';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';
import {makeGetConversionRate} from '@infrastructure/currency/fx-service';

type RateMap = Record<string, number>;

/**
 * We estimate FX loss by comparing each foreign-currency transaction against
 * what the mid-market rate (from our cached data) says it should cost.
 * Financial apps typically charge 1-3% spread on top of mid-market.
 * Since we don't store the exact rate each provider applied, we estimate
 * the provider spread at 2% for notification-parsed transactions and 0%
 * for manual ones (user entered exact amount, no hidden fee).
 */
const ESTIMATED_SPREAD: Record<string, number> = {
  notification: 0.02,
  manual: 0,
};

function getSpreadForSource(source: string): number {
  return ESTIMATED_SPREAD[source] ?? 0.015;
}

export default function MoneyLostTrackerScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const hide = useSettingsStore((s) => s.hideAmounts);
  const {transactions, isLoading: txLoading, refetch} = useTransactions({syncWithFilterStore: false});

  const [midMarketRates, setMidMarketRates] = useState<RateMap>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const fetchedRef = useRef('');

  const foreignTxs = useMemo(
    () => transactions.filter((t) => t.currency.toUpperCase() !== baseCurrency.toUpperCase()),
    [transactions, baseCurrency],
  );

  const allForeignCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const t of foreignTxs) {set.add(t.currency.toUpperCase());}
    return Array.from(set);
  }, [foreignTxs]);

  useEffect(() => {
    const key = allForeignCurrencies.sort().join(',') + ':' + baseCurrency;
    if (key === fetchedRef.current) {return;}
    fetchedRef.current = key;
    if (allForeignCurrencies.length === 0) {
      setMidMarketRates({});
      setRatesLoading(false);
      return;
    }
    let cancelled = false;
    setRatesLoading(true);
    (async () => {
      const ds = getSupabaseDataSource();
      const getRate = makeGetConversionRate({fxRateRepo: ds.fxRates});
      const result: RateMap = {};
      for (const c of allForeignCurrencies) {
        try {
          const r = await getRate(c, baseCurrency);
          if (r !== null) {result[c] = r;}
        } catch { /* skip */ }
      }
      if (!cancelled) {
        setMidMarketRates(result);
        setRatesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [allForeignCurrencies, baseCurrency]);

  const result = useMemo(() => {
    const calculator = new CalculateMoneyLost();
    const fxTxs = foreignTxs
      .filter((t) => midMarketRates[t.currency.toUpperCase()] !== undefined)
      .map((t) => {
        const midRate = midMarketRates[t.currency.toUpperCase()] ?? 1;
        const spread = getSpreadForSource(t.source);
        const appliedRate = midRate * (1 - spread);
        return {
          date: t.transactionDate,
          amount: t.amount,
          currency: t.currency,
          appliedRate,
          midMarketRate: midRate,
          source: t.source ?? 'manual',
        };
      });
    return calculator.execute({transactions: fxTxs, targetCurrency: baseCurrency});
  }, [foreignTxs, baseCurrency, midMarketRates]);

  const isLoading = txLoading || ratesLoading;

  const [refreshing, setRefreshing] = useState(false);
  const wasRefreshingRef = useRef(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  if (refreshing && isLoading) {
    wasRefreshingRef.current = true;
  }
  if (refreshing && !isLoading && wasRefreshingRef.current) {
    setRefreshing(false);
    wasRefreshingRef.current = false;
  }

  return (
    <ScreenContainer scrollable={false}>
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

      <ScrollView
        contentContainerStyle={{flexGrow: 1, padding: spacing.base, paddingTop: 0}}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
      {isLoading ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['4xl']}}>
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading transactions" />
        </View>
      ) : foreignTxs.length === 0 ? (
        <EmptyState
          title="No foreign currency transactions"
          message="FX loss tracking will appear here when you have transactions in currencies other than your base currency."
        />
      ) : (
        <>
          <Card padding="md">
            <View style={styles.totalRow}>
              <View style={[styles.iconCircle, {backgroundColor: `${colors.danger}1A`}]}>
                <Icon name="cash-remove" size={28} color={colors.danger} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[typo.caption, {color: colors.textSecondary}]}>
                  Estimated FX fees lost
                </Text>
                <Text style={[styles.totalValue, {color: result.totalLost > 0 ? colors.danger : colors.success}]}>
                  {result.totalLost > 0 ? '-' : ''}{formatAmountMasked(result.totalLost, result.currency, hide)}
                </Text>
                <Text style={[typo.caption, {color: colors.textTertiary}]}>
                  across {result.transactionCount} foreign currency transactions
                </Text>
              </View>
            </View>
          </Card>

          {result.worstTransaction && result.worstTransaction.lostAmount > 0 && (
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
                    -{formatAmountMasked(result.worstTransaction.lostAmount, result.currency, hide)}
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
                Estimated loss by source
              </Text>
              {result.bySource.map((src) => (
                <View
                  key={src.source}
                  style={[
                    styles.sourceRow,
                    {backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs},
                  ]}>
                  <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
                    {src.source}
                  </Text>
                  <Text style={[typo.footnote, {color: colors.danger}]}>
                    -{formatAmountMasked(src.totalLost, result.currency, hide)}
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
                Estimated loss by month
              </Text>
              {result.byMonth.map((m) => (
                <View
                  key={m.month}
                  style={[
                    styles.sourceRow,
                    {backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs},
                  ]}>
                  <Text style={[typo.footnote, {color: colors.text, flex: 1}]}>
                    {m.month}
                  </Text>
                  <Text style={[typo.footnote, {color: colors.danger}]}>
                    -{formatAmountMasked(m.totalLost, result.currency, hide)}
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

          <Spacer size={spacing.sm} />
          <Card padding="sm" style={{backgroundColor: `${colors.warning}08`}}>
            <View style={styles.tipRow}>
              <Icon name="information-outline" size={16} color={colors.warning} />
              <Text style={[typo.caption, {color: colors.textTertiary, flex: 1}]}>
                Estimates are based on typical provider spreads (1.5-2% for notification-parsed, 0% for manual entries). Actual fees may vary.
              </Text>
            </View>
          </Card>
          <Spacer size={spacing.xl} />
        </>
      )}
      </ScrollView>
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
