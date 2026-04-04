import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmount} from '@shared/utils/format-currency';
import {Skeleton} from './feedback/Skeleton';

export type SummaryPillsProps = {
  income: number;
  expenses: number;
  currency: string;
  isLoading?: boolean;
};

const GAP = 12;
const DOT = 8;

export function SummaryPills({
  income,
  expenses,
  currency,
  isLoading = false,
}: SummaryPillsProps) {
  const {colors, radius} = useTheme();

  const incomeLabel = useMemo(() => formatAmount(income, currency), [currency, income]);
  const expenseLabel = useMemo(() => formatAmount(expenses, currency), [currency, expenses]);

  if (isLoading) {
    return (
      <View
        style={styles.row}
        accessibilityRole="summary"
        accessibilityLabel="Income and expense summary loading"
        accessible
      >
        <View
          style={[
            styles.pill,
            {borderColor: colors.borderLight, backgroundColor: colors.card, borderRadius: radius.md},
          ]}
        >
          <View style={styles.pillRow}>
            <Skeleton width={DOT} height={DOT} borderRadius={radius.full} />
            <View style={styles.pillTextCol}>
              <Skeleton width={56} height={12} borderRadius={radius.sm} />
              <View style={{height: 6}} />
              <Skeleton width={96} height={16} borderRadius={radius.sm} />
            </View>
          </View>
        </View>
        <View
          style={[
            styles.pill,
            {borderColor: colors.borderLight, backgroundColor: colors.card, borderRadius: radius.md},
          ]}
        >
          <View style={styles.pillRow}>
            <Skeleton width={DOT} height={DOT} borderRadius={radius.full} />
            <View style={styles.pillTextCol}>
              <Skeleton width={64} height={12} borderRadius={radius.sm} />
              <View style={{height: 6}} />
              <Skeleton width={96} height={16} borderRadius={radius.sm} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row} accessibilityRole="summary">
      <View
        style={[
          styles.pill,
          {borderColor: colors.borderLight, backgroundColor: colors.card, borderRadius: radius.md},
        ]}
        accessibilityLabel={`Income ${incomeLabel}`}
        accessible
      >
        <View style={styles.pillRow}>
          <View
            style={[styles.dot, {backgroundColor: colors.income}]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.pillTextCol}>
            <Text
              style={[styles.label, {color: colors.textSecondary}]}
              importantForAccessibility="no"
              maxFontSizeMultiplier={1.4}
            >
              Income
            </Text>
            <Text
              style={[styles.amount, {color: colors.income}]}
              importantForAccessibility="no"
              maxFontSizeMultiplier={1.35}
            >
              {incomeLabel}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.pill,
          {borderColor: colors.borderLight, backgroundColor: colors.card, borderRadius: radius.md},
        ]}
        accessibilityLabel={`Expenses ${expenseLabel}`}
        accessible
      >
        <View style={styles.pillRow}>
          <View
            style={[styles.dot, {backgroundColor: colors.expense}]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.pillTextCol}>
            <Text
              style={[styles.label, {color: colors.textSecondary}]}
              importantForAccessibility="no"
              maxFontSizeMultiplier={1.4}
            >
              Expenses
            </Text>
            <Text
              style={[styles.amount, {color: colors.expense}]}
              importantForAccessibility="no"
              maxFontSizeMultiplier={1.35}
            >
              {expenseLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    columnGap: GAP,
    alignSelf: 'stretch',
  },
  pill: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 0,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  pillTextCol: {
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  label: {
    fontSize: 12,
  },
  amount: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
});
