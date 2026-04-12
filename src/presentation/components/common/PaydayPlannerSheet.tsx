import React, {forwardRef, useCallback, useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type {BottomSheetDefaultBackdropProps} from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {PaydayPlanResult} from '@domain/usecases/calculate-payday-plan';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Button} from './Button';

export type PaydayPlannerSheetProps = {
  result: PaydayPlanResult;
  incomeFormatted: string;
  onDismiss: () => void;
};

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function BreakdownRow({
  icon,
  label,
  value,
  color,
  textColor,
  secondaryColor,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={bStyles.row}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[bStyles.label, {color: secondaryColor}]}>{label}</Text>
      <Text style={[bStyles.value, {color: textColor}]}>{value}</Text>
    </View>
  );
}

export const PaydayPlannerSheet = forwardRef<BottomSheet, PaydayPlannerSheetProps>(
  function PaydayPlannerSheet({result, incomeFormatted, onDismiss}, ref) {
    const {colors, spacing, radius, typography: typo} = useTheme();
    const snapPoints = useMemo(() => ['65%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetDefaultBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    const currency = result.currency;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: colors.card}}
        handleIndicatorStyle={{backgroundColor: colors.border}}
      >
        <BottomSheetView style={[styles.content, {padding: spacing.base}]}>
            <View style={styles.header}>
              <View
                style={[
                  styles.iconCircle,
                  {backgroundColor: `${colors.income}1A`},
                ]}
              >
                <Icon name="cash-check" size={28} color={colors.income} />
              </View>
              <Text style={[typo.title2, {color: colors.text, textAlign: 'center'}]}>
                You received {incomeFormatted}!
              </Text>
              <Text
                style={[
                  typo.footnote,
                  {color: colors.textSecondary, textAlign: 'center'},
                ]}
              >
                Here is your spending plan until next payday
              </Text>
            </View>

            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radius.lg,
                  padding: spacing.base,
                  marginTop: spacing.md,
                },
              ]}
            >
              <BreakdownRow
                icon="receipt"
                label="Upcoming bills"
                value={formatCents(result.upcomingBillsTotal, currency)}
                color={colors.danger}
                textColor={colors.text}
                secondaryColor={colors.textSecondary}
              />
              <BreakdownRow
                icon="chart-pie"
                label="Budget commitments"
                value={formatCents(result.budgetCommitmentsTotal, currency)}
                color={colors.warning}
                textColor={colors.text}
                secondaryColor={colors.textSecondary}
              />
              <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />
              <BreakdownRow
                icon="wallet-outline"
                label="Available to spend"
                value={formatCents(result.availableToSpend, currency)}
                color={colors.success}
                textColor={colors.text}
                secondaryColor={colors.textSecondary}
              />
            </View>

            <View
              style={[
                styles.dailyCard,
                {
                  backgroundColor: `${colors.success}12`,
                  borderRadius: radius.lg,
                  padding: spacing.base,
                  marginTop: spacing.sm,
                },
              ]}
            >
              <Text style={[typo.footnote, {color: colors.textSecondary}]}>
                Safe daily spending
              </Text>
              <Text style={[styles.dailyAmount, {color: colors.success}]}>
                {formatCents(result.safeDaily, currency)}
              </Text>
              <Text style={[typo.caption, {color: colors.textTertiary}]}>
                per day until next payday
              </Text>
            </View>

            {result.nextBillName !== '' && (
              <Text
                style={[
                  typo.caption,
                  {
                    color: colors.textTertiary,
                    textAlign: 'center',
                    marginTop: spacing.sm,
                  },
                ]}
              >
                Next bill: {result.nextBillName} ({formatCents(result.nextBillAmount, currency)})
              </Text>
            )}

            <View style={{marginTop: spacing.md}}>
              <Button title="Got it" onPress={onDismiss} testID="payday-dismiss" />
            </View>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  breakdownCard: {
    gap: 10,
  },
  divider: {
    height: 1,
  },
  dailyCard: {
    alignItems: 'center',
    gap: 2,
  },
  dailyAmount: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
  },
});

const bStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: fontWeight.medium,
  },
  value: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
});
