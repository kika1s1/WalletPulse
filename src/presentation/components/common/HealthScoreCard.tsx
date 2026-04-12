import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {HealthScoreFactor, HealthScoreResult} from '@domain/usecases/calculate-health-score';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {HealthScoreGauge} from '@presentation/components/charts/HealthScoreGauge';
import {Card} from './Card';
import {PaywallGate} from './PaywallGate';

export type HealthScoreCardProps = {
  result: HealthScoreResult;
  testID?: string;
};

function FactorRow({factor, color, textColor, secondaryColor}: {
  factor: HealthScoreFactor;
  color: string;
  textColor: string;
  secondaryColor: string;
}) {
  const barWidth = `${Math.max(factor.score, 2)}%`;

  return (
    <View style={fStyles.row}>
      <View style={fStyles.labelRow}>
        <Text style={[fStyles.name, {color: textColor}]} numberOfLines={1}>
          {factor.name}
        </Text>
        <Text style={[fStyles.score, {color: secondaryColor}]}>
          {factor.score}
        </Text>
      </View>
      <View style={[fStyles.barBg, {backgroundColor: `${color}22`}]}>
        <View
          style={[
            fStyles.barFill,
            {width: barWidth as any, backgroundColor: color},
          ]}
        />
      </View>
      <Text style={[fStyles.tip, {color: secondaryColor}]}>{factor.tip}</Text>
    </View>
  );
}

export const HealthScoreCard = React.memo(function HealthScoreCard({
  result,
  testID,
}: HealthScoreCardProps) {
  const {colors, spacing, typography: typo} = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const scoreColor =
    result.score >= 70
      ? colors.success
      : result.score >= 40
        ? colors.warning
        : colors.danger;

  return (
    <PaywallGate
      feature="financialHealthScore"
      featureLabel="Financial Health Score"
    >
      <Animated.View entering={FadeInDown.duration(350).springify()}>
        <Card testID={testID ?? 'health-score-card'} style={styles.card}>
          <View style={styles.header}>
            <Text style={[typo.headline, {color: colors.text, flex: 1}]}>
              Financial Health
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Hide details' : 'View details'}
              onPress={toggleExpanded}
              hitSlop={12}
            >
              <Icon
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={[styles.gaugeRow, {marginTop: spacing.sm}]}>
            <HealthScoreGauge
              score={result.score}
              grade={result.grade}
              trend={result.trend}
              size={100}
            />
            <View style={styles.summaryColumn}>
              <Text style={[styles.summaryLabel, {color: colors.textSecondary}]}>
                Score
              </Text>
              <Text style={[styles.summaryValue, {color: scoreColor}]}>
                {result.score}/100
              </Text>
              <Text style={[styles.trendLabel, {color: colors.textSecondary}]}>
                {result.trend === 'improving'
                  ? '↑ Improving'
                  : result.trend === 'declining'
                    ? '↓ Declining'
                    : '→ Stable'}
              </Text>
            </View>
          </View>

          {expanded && (
            <View style={[styles.factorsSection, {marginTop: spacing.md}]}>
              <Text
                style={[
                  typo.footnote,
                  {color: colors.textSecondary, marginBottom: spacing.sm},
                ]}
              >
                Score Breakdown
              </Text>
              {result.factors.map((factor) => (
                <FactorRow
                  key={factor.name}
                  factor={factor}
                  color={scoreColor}
                  textColor={colors.text}
                  secondaryColor={colors.textSecondary}
                />
              ))}
            </View>
          )}
        </Card>
      </Animated.View>
    </PaywallGate>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryColumn: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
  },
  trendLabel: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    marginTop: 4,
  },
  factorsSection: {
    gap: 10,
  },
});

const fStyles = StyleSheet.create({
  row: {
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  score: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
  barBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  tip: {
    fontSize: 11,
    lineHeight: 14,
  },
});
