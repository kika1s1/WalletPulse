import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {AmountInput} from '@presentation/components/common/AmountInput';
import {Button} from '@presentation/components/common/Button';
import {useBudgets} from '@presentation/hooks/useBudgets';
import {useCategories} from '@presentation/hooks/useCategories';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeCreateBudget} from '@domain/usecases/create-budget';
import {makeUpdateBudget} from '@domain/usecases/update-budget';
import {generateId} from '@shared/utils/hash';
import {isOverallBudget, type BudgetPeriod} from '@domain/entities/Budget';
import {createCurrency, isValidCurrencyCode} from '@domain/value-objects/Currency';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CreateBudget'>;
type CreateBudgetRoute = RouteProp<SettingsStackParamList, 'CreateBudget'>;

function currencySymbolForCode(code: string): string {
  const normalized = code.toUpperCase();
  if (isValidCurrencyCode(normalized)) {
    return createCurrency(normalized).symbol;
  }
  return normalized;
}

function getMonthRange(): {start: number; end: number} {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return {start, end};
}

function getWeekRange(): {start: number; end: number} {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {start: start.getTime(), end: end.getTime()};
}

export default function CreateBudgetScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<CreateBudgetRoute>();
  const editBudgetId = route.params?.editBudgetId;
  const isEditing = Boolean(editBudgetId);

  const {budgets, isLoading: budgetsLoading} = useBudgets();
  const {expenseCategories} = useCategories();

  const existingBudget = useMemo(
    () => (editBudgetId ? budgets.find((b) => b.id === editBudgetId) : undefined),
    [budgets, editBudgetId],
  );

  const [amount, setAmount] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [rollover, setRollover] = useState(false);
  const [isOverall, setIsOverall] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState('USD');
  const [isSaving, setIsSaving] = useState(false);

  const hydratedBudgetIdRef = useRef<string | null>(null);
  const prevEditBudgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prev = prevEditBudgetIdRef.current;
    prevEditBudgetIdRef.current = editBudgetId;
    if (prev && !editBudgetId) {
      hydratedBudgetIdRef.current = null;
      setAmount(0);
      setSelectedCategoryId(null);
      setPeriod('monthly');
      setRollover(false);
      setIsOverall(false);
      setBudgetCurrency('USD');
    }
  }, [editBudgetId]);

  useEffect(() => {
    if (!editBudgetId || !existingBudget) {
      return;
    }
    if (hydratedBudgetIdRef.current === existingBudget.id) {
      return;
    }
    hydratedBudgetIdRef.current = existingBudget.id;
    setAmount(existingBudget.amount);
    setPeriod(existingBudget.period);
    setRollover(existingBudget.rollover);
    const overall = isOverallBudget(existingBudget);
    setIsOverall(overall);
    setSelectedCategoryId(overall ? null : existingBudget.categoryId);
    setBudgetCurrency(existingBudget.currency);
  }, [editBudgetId, existingBudget]);

  const editLoadPending = isEditing && budgetsLoading;
  const editNotFound = isEditing && !budgetsLoading && !existingBudget;

  const canSave = amount > 0 && (isOverall || selectedCategoryId !== null);

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) {
      return;
    }
    setIsSaving(true);

    try {
      const ds = getLocalDataSource();
      const now = Date.now();

      if (isEditing && existingBudget) {
        const update = makeUpdateBudget({budgetRepo: ds.budgets});
        await update({
          id: existingBudget.id,
          categoryId: isOverall ? null : selectedCategoryId,
          amount,
          currency: budgetCurrency,
          period,
          startDate: existingBudget.startDate,
          endDate: existingBudget.endDate,
          rollover,
          isActive: existingBudget.isActive,
          createdAt: existingBudget.createdAt,
          updatedAt: existingBudget.updatedAt,
        });
      } else {
        const create = makeCreateBudget({budgetRepo: ds.budgets});
        const range = period === 'monthly' ? getMonthRange() : getWeekRange();
        await create({
          id: generateId(),
          categoryId: isOverall ? null : selectedCategoryId,
          amount,
          currency: 'USD',
          period,
          startDate: range.start,
          endDate: range.end,
          rollover,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert(
        isEditing ? 'Could not update budget' : 'Could not create budget',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    amount,
    budgetCurrency,
    canSave,
    existingBudget,
    isEditing,
    isOverall,
    isSaving,
    navigation,
    period,
    rollover,
    selectedCategoryId,
  ]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
          },
        ]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelBtn, {color: colors.textSecondary}]}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {isEditing ? 'Edit Budget' : 'New Budget'}
          </Text>
          <View style={{width: 60}} />
        </View>
      </View>

      {editLoadPending ? (
        <View style={styles.centeredState}>
          <ActivityIndicator
            accessibilityLabel="Loading budget"
            color={colors.primary}
            size="large"
          />
        </View>
      ) : editNotFound ? (
        <View style={[styles.centeredState, {paddingHorizontal: spacing.base}]}>
          <Text style={[styles.notFoundTitle, {color: colors.text}]}>
            Budget not found
          </Text>
          <Text style={[styles.notFoundBody, {color: colors.textSecondary}]}>
            This budget may have been deleted. Go back and refresh the list.
          </Text>
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={{padding: spacing.base, paddingBottom: spacing['4xl']}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={[styles.section, {gap: spacing.sm}]}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>
            BUDGET AMOUNT
          </Text>
          <View
            style={[
              styles.amountContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
              shadows.sm,
            ]}>
            <AmountInput
              autoFocus={!isEditing}
              currency={budgetCurrency}
              currencySymbol={currencySymbolForCode(budgetCurrency)}
              onChangeValue={setAmount}
              value={amount}
            />
          </View>
        </View>

        <View style={[styles.section, {gap: spacing.sm, marginTop: spacing.xl}]}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>
            BUDGET TYPE
          </Text>

          <View
            style={[
              styles.typeRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                borderRadius: radius.md,
                padding: spacing.base,
              },
            ]}>
            <View style={{flex: 1}}>
              <Text style={[styles.typeLabel, {color: colors.text}]}>
                Overall Budget
              </Text>
              <Text style={[styles.typeDesc, {color: colors.textTertiary}]}>
                Track total spending across all categories
              </Text>
            </View>
            <Switch
              onValueChange={(val) => {
                setIsOverall(val);
                if (val) {
                  setSelectedCategoryId(null);
                }
              }}
              thumbColor={isOverall ? colors.primary : colors.border}
              trackColor={{false: colors.borderLight, true: colors.primaryLight}}
              value={isOverall}
            />
          </View>

          {!isOverall && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  {color: colors.textTertiary, marginTop: spacing.md},
                ]}>
                SELECT CATEGORY
              </Text>
              <View style={{gap: spacing.xs}}>
                {expenseCategories.map((cat) => {
                  const selected = selectedCategoryId === cat.id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{selected}}
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={[
                        styles.catRow,
                        {
                          backgroundColor: selected
                            ? `${colors.primary}18`
                            : colors.card,
                          borderColor: selected
                            ? colors.primary
                            : colors.borderLight,
                          borderRadius: radius.md,
                          paddingHorizontal: spacing.base,
                          paddingVertical: spacing.md,
                        },
                      ]}>
                      <View
                        style={[styles.catDot, {backgroundColor: cat.color}]}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.catName,
                          {
                            color: selected ? colors.primary : colors.text,
                            fontWeight: selected
                              ? fontWeight.semibold
                              : fontWeight.regular,
                          },
                        ]}>
                        {cat.name}
                      </Text>
                      {selected && (
                        <Text style={[styles.checkMark, {color: colors.primary}]}>
                          ✓
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={[styles.section, {gap: spacing.sm, marginTop: spacing.xl}]}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>
            PERIOD
          </Text>
          <View style={[styles.periodRow, {gap: spacing.sm}]}>
            {(['monthly', 'weekly'] as BudgetPeriod[]).map((p) => {
              const active = period === p;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{selected: active}}
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[
                    styles.periodChip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.borderLight,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.periodLabel,
                      {color: active ? '#FFFFFF' : colors.textSecondary},
                    ]}>
                    {p === 'monthly' ? 'Monthly' : 'Weekly'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, {marginTop: spacing.xl}]}>
          <View
            style={[
              styles.typeRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                borderRadius: radius.md,
                padding: spacing.base,
              },
            ]}>
            <View style={{flex: 1}}>
              <Text style={[styles.typeLabel, {color: colors.text}]}>
                Rollover unused budget
              </Text>
              <Text style={[styles.typeDesc, {color: colors.textTertiary}]}>
                Carry unspent amount to the next period
              </Text>
            </View>
            <Switch
              onValueChange={setRollover}
              thumbColor={rollover ? colors.primary : colors.border}
              trackColor={{false: colors.borderLight, true: colors.primaryLight}}
              value={rollover}
            />
          </View>
        </View>

        <View style={{marginTop: spacing['2xl']}}>
          <Button
            disabled={!canSave}
            fullWidth
            loading={isSaving}
            onPress={handleSave}
            size="lg"
            title={isEditing ? 'Update Budget' : 'Create Budget'}
          />
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  centeredState: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  notFoundTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundBody: {fontSize: 14, lineHeight: 20, textAlign: 'center'},
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBtn: {fontSize: 16, fontWeight: fontWeight.medium},
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  section: {},
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  amountContainer: {borderWidth: StyleSheet.hairlineWidth},
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  typeLabel: {fontSize: 15, fontWeight: fontWeight.medium},
  typeDesc: {fontSize: 12, lineHeight: 16, marginTop: 2},
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  catDot: {width: 10, height: 10, borderRadius: 5},
  catName: {flex: 1, fontSize: 14},
  checkMark: {fontSize: 16, fontWeight: fontWeight.bold},
  periodRow: {flexDirection: 'row'},
  periodChip: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  periodLabel: {fontSize: 14, fontWeight: fontWeight.medium},
});
