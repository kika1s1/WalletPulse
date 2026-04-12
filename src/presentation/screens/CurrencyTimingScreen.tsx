import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {Spacer} from '@presentation/components/layout/Spacer';
import {BackButton, Card, PaywallGate} from '@presentation/components/common';
import {AnalyzeCurrencyTiming} from '@domain/usecases/analyze-currency-timing';
import {useAppStore} from '@presentation/stores/useAppStore';

const DEMO_PAIR = {from: 'USD', to: 'ETB'};

function generateDemoRates(): {rate: number; date: number}[] {
  const rates: {rate: number; date: number}[] = [];
  const now = Date.now();
  const base = 55.0;
  for (let i = 89; i >= 0; i--) {
    rates.push({
      rate: base + Math.sin(i / 10) * 2 + Math.random() * 0.5,
      date: now - i * 86_400_000,
    });
  }
  return rates;
}

const REC_ICONS: Record<string, {name: string; color: string}> = {
  buy_now: {name: 'arrow-down-circle', color: '#27ae60'},
  wait: {name: 'clock-outline', color: '#e67e22'},
  neutral: {name: 'minus-circle-outline', color: '#7f8c8d'},
};

const TREND_LABELS: Record<string, string> = {
  rising: '↑ Rising',
  falling: '↓ Falling',
  stable: '→ Stable',
};

export default function CurrencyTimingScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const baseCurrency = useAppStore((s) => s.baseCurrency);

  const pair = useMemo(() => ({from: baseCurrency, to: DEMO_PAIR.to}), [baseCurrency]);

  const result = useMemo(() => {
    const analyzer = new AnalyzeCurrencyTiming();
    return analyzer.execute({currencyPair: pair, historicalRates: generateDemoRates()});
  }, [pair]);

  const recStyle = REC_ICONS[result.recommendation] ?? REC_ICONS.neutral;

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

      <PaywallGate feature="currencyTimingAdvisor" featureLabel="Currency Timing Advisor">
        <ScrollView contentContainerStyle={{padding: spacing.base, paddingTop: 0}}>
          <Card padding="md">
            <Text style={[typo.caption, {color: colors.textSecondary}]}>
              {pair.from} to {pair.to}
            </Text>
            <Text style={[styles.rateValue, {color: colors.text}]}>
              {result.currentRate.toFixed(4)}
            </Text>
            <Text style={[typo.caption, {color: colors.textTertiary}]}>
              {TREND_LABELS[result.trend] ?? 'Stable'} trend
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
              <Text style={[styles.statVal, {color: colors.text}]}>{result.average30Day.toFixed(4)}</Text>
            </Card>
            <Card padding="sm" style={{flex: 1}}>
              <Text style={[typo.caption, {color: colors.textSecondary}]}>90-day avg</Text>
              <Text style={[styles.statVal, {color: colors.text}]}>{result.average90Day.toFixed(4)}</Text>
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
                  ? `Current rate is ${result.percentAboveAverage}% above average. This may be a good time to convert.`
                  : `Current rate is ${Math.abs(result.percentAboveAverage)}% below average. Waiting may yield better rates.`}
              </Text>
            </View>
          </Card>
          <Spacer size={spacing.xl} />
        </ScrollView>
      </PaywallGate>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {alignSelf: 'stretch'},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rateValue: {fontSize: 28, fontWeight: fontWeight.bold, marginTop: 2},
  recRow: {flexDirection: 'row', alignItems: 'center', gap: 14},
  recCircle: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  recLabel: {fontSize: 16, fontWeight: fontWeight.semibold},
  statsGrid: {flexDirection: 'row', gap: 10},
  statVal: {fontSize: 16, fontWeight: fontWeight.bold, marginTop: 2},
  tipRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
});
