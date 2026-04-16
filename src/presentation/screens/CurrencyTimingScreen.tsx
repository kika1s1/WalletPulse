import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {Spacer} from '@presentation/components/layout/Spacer';
import {BackButton, Card} from '@presentation/components/common';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {AnalyzeCurrencyTiming, type HistoricalRate} from '@domain/usecases/analyze-currency-timing';
import {useAppStore} from '@presentation/stores/useAppStore';
import {useWallets} from '@presentation/hooks/useWallets';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';

const TREND_LABELS: Record<string, string> = {
  rising: 'Rising',
  falling: 'Falling',
  stable: 'Stable',
};

const TREND_ICONS: Record<string, string> = {
  rising: 'trending-up',
  falling: 'trending-down',
  stable: 'trending-neutral',
};

export default function CurrencyTimingScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {wallets} = useWallets();

  const walletCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const w of wallets) {
      if (w.isActive && w.currency.toUpperCase() !== baseCurrency.toUpperCase()) {
        set.add(w.currency.toUpperCase());
      }
    }
    return Array.from(set);
  }, [wallets, baseCurrency]);

  const [targetCurrency, setTargetCurrency] = useState<string>(() =>
    walletCurrencies[0] ?? 'EUR',
  );

  useEffect(() => {
    if (walletCurrencies.length > 0 && !walletCurrencies.includes(targetCurrency)) {
      setTargetCurrency(walletCurrencies[0]);
    }
  }, [walletCurrencies, targetCurrency]);

  const [historicalRates, setHistoricalRates] = useState<HistoricalRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const fetchedRef = useRef('');

  const fetchRates = useCallback(async () => {
    const key = `${baseCurrency}:${targetCurrency}`;
    if (key === fetchedRef.current) {return;}
    fetchedRef.current = key;
    setRatesLoading(true);

    try {
      const ds = getLocalDataSource();
      const allRates = await ds.fxRates.findAllByBase(baseCurrency.toUpperCase());
      const matching = allRates.filter(
        (r) => r.targetCurrency === targetCurrency.toUpperCase(),
      );

      if (matching.length > 0) {
        const sorted = [...matching].sort((a, b) => a.fetchedAt - b.fetchedAt);
        setHistoricalRates(
          sorted.map((r) => ({rate: r.rate, date: r.fetchedAt})),
        );
      } else {
        const inverseRates = await ds.fxRates.findAllByBase(targetCurrency.toUpperCase());
        const inverseMatching = inverseRates.filter(
          (r) => r.targetCurrency === baseCurrency.toUpperCase(),
        );
        if (inverseMatching.length > 0) {
          const sorted = [...inverseMatching].sort((a, b) => a.fetchedAt - b.fetchedAt);
          setHistoricalRates(
            sorted.map((r) => ({rate: 1 / r.rate, date: r.fetchedAt})),
          );
        } else {
          setHistoricalRates([]);
        }
      }
    } catch {
      setHistoricalRates([]);
    } finally {
      setRatesLoading(false);
    }
  }, [baseCurrency, targetCurrency]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const result = useMemo(() => {
    if (historicalRates.length === 0) {return null;}
    const analyzer = new AnalyzeCurrencyTiming();
    return analyzer.execute({
      currencyPair: {from: baseCurrency, to: targetCurrency},
      historicalRates,
    });
  }, [baseCurrency, targetCurrency, historicalRates]);

  const recStyle = useMemo(() => {
    if (!result) {
      return {name: 'minus-circle-outline' as const, color: colors.primary};
    }
    switch (result.recommendation) {
      case 'buy_now':
        return {name: 'arrow-down-circle' as const, color: colors.success};
      case 'wait':
        return {name: 'clock-outline' as const, color: colors.warning};
      default:
        return {name: 'minus-circle-outline' as const, color: colors.primary};
    }
  }, [result, colors.primary, colors.success, colors.warning]);

  const availableCurrencies = walletCurrencies.length > 0
    ? walletCurrencies
    : ['EUR', 'GBP', 'ETB'];

  return (
    <ScreenContainer>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.sm} />
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[typo.title3, {color: colors.text, flex: 1}]}>
            Currency Timing
          </Text>
        </View>
        <Spacer size={spacing.base} />
      </View>

      <ScrollView contentContainerStyle={{padding: spacing.base, paddingTop: 0}}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.currencyPickerRow}>
          {availableCurrencies.map((c) => {
            const active = c === targetCurrency;
            return (
              <Pressable
                key={c}
                accessibilityRole="tab"
                accessibilityState={{selected: active}}
                onPress={() => setTargetCurrency(c)}
                style={[
                  styles.currencyChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radius.md,
                  },
                ]}>
                <Text
                  style={[
                    styles.currencyChipText,
                    {color: active ? colors.onPrimary : colors.text},
                  ]}>
                  {baseCurrency} / {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Spacer size={spacing.base} />

        {ratesLoading ? (
          <View style={{alignItems: 'center', paddingVertical: spacing['4xl']}}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !result ? (
          <EmptyState
            title="No rate data available"
            message={`No cached exchange rate history found for ${baseCurrency}/${targetCurrency}. Rates are cached when the app fetches FX data. Use the app for a few days and check back.`}
          />
        ) : (
          <>
            <Card padding="md">
              <Text style={[typo.caption, {color: colors.textSecondary}]}>
                {baseCurrency} to {targetCurrency}
              </Text>
              <Text style={[styles.rateValue, {color: colors.text}]}>
                {result.currentRate.toFixed(4)}
              </Text>
              <View style={styles.trendRow}>
                <Icon
                  name={TREND_ICONS[result.trend] ?? 'trending-neutral'}
                  size={16}
                  color={
                    result.trend === 'rising' ? colors.success
                    : result.trend === 'falling' ? colors.danger
                    : colors.textTertiary
                  }
                />
                <Text style={[typo.caption, {
                  color: result.trend === 'rising' ? colors.success
                    : result.trend === 'falling' ? colors.danger
                    : colors.textTertiary,
                }]}>
                  {TREND_LABELS[result.trend] ?? 'Stable'} trend
                </Text>
              </View>
              <Text style={[typo.caption, {color: colors.textTertiary, marginTop: 4}]}>
                Based on {historicalRates.length} cached data point{historicalRates.length !== 1 ? 's' : ''}
              </Text>
            </Card>

            <Spacer size={spacing.md} />

            <Card padding="md">
              <View style={styles.recRow}>
                <View style={[styles.recCircle, {backgroundColor: `${recStyle.color}1A`}]}>
                  <Icon name={recStyle.name} size={28} color={recStyle.color} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={[styles.recLabel, {color: colors.text}]}>
                    {result.recommendation === 'buy_now'
                      ? 'Good time to convert'
                      : result.recommendation === 'wait'
                        ? 'Consider waiting'
                        : 'No strong signal'}
                  </Text>
                  <Text style={[typo.caption, {color: colors.textSecondary}]}>
                    Confidence: {result.confidence}
                  </Text>
                </View>
              </View>
            </Card>

            <Spacer size={spacing.md} />

            <View style={styles.statsGrid}>
              <Card padding="sm" style={{flex: 1}}>
                <Text style={[typo.caption, {color: colors.textSecondary}]}>30-day avg</Text>
                <Text style={[styles.statVal, {color: colors.text}]}>
                  {result.average30Day > 0 ? result.average30Day.toFixed(4) : 'N/A'}
                </Text>
              </Card>
              <Card padding="sm" style={{flex: 1}}>
                <Text style={[typo.caption, {color: colors.textSecondary}]}>90-day avg</Text>
                <Text style={[styles.statVal, {color: colors.text}]}>
                  {result.average90Day > 0 ? result.average90Day.toFixed(4) : 'N/A'}
                </Text>
              </Card>
            </View>

            <Spacer size={spacing.sm} />

            <View style={styles.statsGrid}>
              <Card padding="sm" style={{flex: 1}}>
                <Text style={[typo.caption, {color: colors.textSecondary}]}>Best rate</Text>
                <Text style={[styles.statVal, {color: colors.success}]}>
                  {result.bestRateInPeriod.rate.toFixed(4)}
                </Text>
                <Text style={[typo.caption, {color: colors.textTertiary}]}>
                  {new Date(result.bestRateInPeriod.date).toLocaleDateString()}
                </Text>
              </Card>
              <Card padding="sm" style={{flex: 1}}>
                <Text style={[typo.caption, {color: colors.textSecondary}]}>Worst rate</Text>
                <Text style={[styles.statVal, {color: colors.danger}]}>
                  {result.worstRateInPeriod.rate.toFixed(4)}
                </Text>
                <Text style={[typo.caption, {color: colors.textTertiary}]}>
                  {new Date(result.worstRateInPeriod.date).toLocaleDateString()}
                </Text>
              </Card>
            </View>

            <Spacer size={spacing.md} />

            <Card padding="md" style={{backgroundColor: `${colors.primary}08`}}>
              <View style={styles.tipRow}>
                <Icon name="information-outline" size={18} color={colors.primary} />
                <Text style={[typo.footnote, {color: colors.textSecondary, flex: 1}]}>
                  {result.isAboveAverage
                    ? `Current rate is ${result.percentAboveAverage}% above average. This may be a good time to convert ${baseCurrency} to ${targetCurrency}.`
                    : `Current rate is ${Math.abs(result.percentAboveAverage)}% below average. Waiting may yield better rates for ${baseCurrency} to ${targetCurrency}.`}
                </Text>
              </View>
            </Card>

            {historicalRates.length < 5 && (
              <>
                <Spacer size={spacing.sm} />
                <Card padding="sm" style={{backgroundColor: `${colors.warning}08`}}>
                  <View style={styles.tipRow}>
                    <Icon name="alert-circle-outline" size={16} color={colors.warning} />
                    <Text style={[typo.caption, {color: colors.textTertiary, flex: 1}]}>
                      Limited data available. Analysis accuracy improves as more FX rate snapshots are collected over time.
                    </Text>
                  </View>
                </Card>
              </>
            )}
          </>
        )}
        <Spacer size={spacing.xl} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {alignSelf: 'stretch'},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  currencyPickerRow: {flexDirection: 'row', gap: 8, paddingVertical: 4, paddingRight: 24},
  currencyChip: {borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8},
  currencyChipText: {fontSize: 13, fontWeight: fontWeight.semibold},
  rateValue: {fontSize: 28, fontWeight: fontWeight.bold, marginTop: 2},
  trendRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  recRow: {flexDirection: 'row', alignItems: 'center', gap: 14},
  recCircle: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  recLabel: {fontSize: 16, fontWeight: fontWeight.semibold},
  statsGrid: {flexDirection: 'row', gap: 10},
  statVal: {fontSize: 16, fontWeight: fontWeight.bold, marginTop: 2},
  tipRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
});
