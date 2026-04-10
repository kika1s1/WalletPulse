import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';
import {ScreenContainer} from '@presentation/components/layout';
import {EmptyState} from '@presentation/components/feedback';
import {SwipeableRow, type SwipeAction} from '@presentation/components/common/SwipeableRow';
import {
  applyTemplate,
  getDefaultTemplates,
  type TransactionTemplate,
} from '@domain/usecases/quick-action-templates';
import {buildAddTransactionParamsFromApplied} from '@presentation/navigation/build-add-transaction-params';
import type {SettingsStackParamList, TabParamList} from '@presentation/navigation/types';
import {useTemplates} from '@presentation/hooks/useTemplates';

type TemplateManagementNav = CompositeNavigationProp<
  NativeStackNavigationProp<SettingsStackParamList, 'TemplateManagement'>,
  BottomTabNavigationProp<TabParamList>
>;

const BUILTIN_IDS = new Set(getDefaultTemplates().map((t) => t.id));

function hexToAlpha(hex: string, alpha: string): string {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

function isBuiltInTemplate(item: TransactionTemplate): boolean {
  return BUILTIN_IDS.has(item.id);
}

export default function TemplateManagementScreen() {
  const navigation = useNavigation<TemplateManagementNav>();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    templates,
    userTemplates,
    defaultTemplates,
    isLoading,
    deleteTemplate,
    incrementUsage,
    refetch,
  } = useTemplates();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const useTemplate = useCallback(
    (item: TransactionTemplate) => {
      if (!isBuiltInTemplate(item)) {
        void incrementUsage(item.id);
      }
      const applied = applyTemplate(item);
      navigation.getParent()?.navigate('TransactionsTab', {
        screen: 'AddTransaction',
        params: buildAddTransactionParamsFromApplied(applied),
      });
    },
    [navigation, incrementUsage],
  );

  const confirmDelete = useCallback(
    (item: TransactionTemplate) => {
      Alert.alert(
        'Delete template',
        `Remove "${item.name}"? This cannot be undone.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void deleteTemplate(item.id).catch((e) =>
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete'),
              );
            },
          },
        ],
      );
    },
    [deleteTemplate],
  );

  const userExpense = useMemo(
    () => userTemplates.filter((t) => t.type === 'expense'),
    [userTemplates],
  );
  const userIncome = useMemo(
    () => userTemplates.filter((t) => t.type === 'income'),
    [userTemplates],
  );
  const builtinExpense = useMemo(
    () => defaultTemplates.filter((t) => t.type === 'expense'),
    [defaultTemplates],
  );
  const builtinIncome = useMemo(
    () => defaultTemplates.filter((t) => t.type === 'income'),
    [defaultTemplates],
  );

  const expenseAll = useMemo(() => templates.filter((t) => t.type === 'expense'), [templates]);
  const incomeAll = useMemo(() => templates.filter((t) => t.type === 'income'), [templates]);

  const swipeDeleteAction = useCallback(
    (item: TransactionTemplate): SwipeAction => ({
      label: 'Delete',
      color: colors.danger,
      onPress: () => confirmDelete(item),
    }),
    [colors.danger, confirmDelete],
  );

  const renderTemplateCard = useCallback(
    (item: TransactionTemplate, idx: number, isUser: boolean) => {
      const builtIn = !isUser;

      const cardInner = (
        <Animated.View entering={FadeInDown.delay(idx * 60).duration(300)}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: radius.md,
              },
              shadows.sm,
            ]}>
            <Pressable
              accessibilityLabel={`Use template ${item.name}`}
              accessibilityRole="button"
              onPress={() => useTemplate(item)}
              style={[styles.cardMain, {flex: 1}]}>
              <View
                style={[
                  styles.iconCircle,
                  {backgroundColor: hexToAlpha(item.color, '22')},
                ]}>
                <AppIcon name={resolveIconName(item.icon)} size={20} color={item.color} />
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.cardName, {color: colors.text}]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.cardMeta}>
                  {item.categoryId && (
                    <Text
                      style={[styles.metaChip, {color: colors.textTertiary}]}
                      numberOfLines={1}>
                      {item.categoryId.replace(/-/g, ' ')}
                    </Text>
                  )}
                  {item.amount !== undefined && item.amount > 0 && (
                    <Text style={[styles.metaChip, {color: colors.textTertiary}]}>
                      {item.currency ?? ''} {(item.amount / 100).toFixed(2)}
                    </Text>
                  )}
                </View>
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {item.tags.map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.tagChip,
                          {
                            backgroundColor: colors.primaryLight + '22',
                            borderRadius: radius.full,
                          },
                        ]}>
                        <Text style={[styles.tagLabel, {color: colors.primary}]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <Text style={[styles.useLabel, {color: colors.primary}]}>Use</Text>
                {builtIn && (
                  <View
                    style={[
                      styles.builtinBadge,
                      {
                        backgroundColor: colors.textTertiary + '22',
                        borderRadius: radius.xs,
                      },
                    ]}>
                    <Text style={[styles.builtinBadgeText, {color: colors.textSecondary}]}>
                      Built-in
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        item.type === 'income' ? colors.successLight : colors.dangerLight,
                      borderRadius: radius.xs,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color: item.type === 'income' ? colors.success : colors.danger,
                      },
                    ]}>
                    {item.type}
                  </Text>
                </View>
              </View>
            </Pressable>

            {isUser && (
              <Pressable
                accessibilityLabel={`Delete template ${item.name}`}
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => confirmDelete(item)}
                style={styles.deleteBtn}>
                <AppIcon name="delete-outline" size={22} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      );

      if (isUser) {
        return (
          <SwipeableRow key={item.id} rightActions={[swipeDeleteAction(item)]}>
            {cardInner}
          </SwipeableRow>
        );
      }

      return <React.Fragment key={item.id}>{cardInner}</React.Fragment>;
    },
    [
      colors,
      confirmDelete,
      radius,
      shadows,
      swipeDeleteAction,
      useTemplate,
    ],
  );

  const renderTypeRows = useCallback(
    (expenseItems: TransactionTemplate[], incomeItems: TransactionTemplate[], isUser: boolean) => {
      let idx = 0;
      const nodes: React.ReactNode[] = [];
      if (expenseItems.length > 0) {
        nodes.push(
          <Text
            key="exp-h"
            style={[styles.subsectionTitle, {color: colors.textTertiary, marginTop: idx > 0 ? 12 : 0}]}>
            Expense
          </Text>,
        );
        expenseItems.forEach((t) => {
          nodes.push(renderTemplateCard(t, idx, isUser));
          idx += 1;
        });
      }
      if (incomeItems.length > 0) {
        nodes.push(
          <Text
            key="inc-h"
            style={[styles.subsectionTitle, {color: colors.textTertiary, marginTop: expenseItems.length > 0 ? 12 : 0}]}>
            Income
          </Text>,
        );
        incomeItems.forEach((t) => {
          nodes.push(renderTemplateCard(t, idx, isUser));
          idx += 1;
        });
      }
      return nodes;
    },
    [colors.textTertiary, renderTemplateCard],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View
          style={[
            styles.header,
            {paddingHorizontal: spacing.base, paddingTop: spacing.sm},
          ]}>
          <BackButton />
          <Text style={[typography.title3, {color: colors.text}]}>Quick Templates</Text>
          <Pressable
            accessibilityLabel="Create template"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigation.navigate('CreateTemplate')}
            style={styles.headerAdd}>
            <AppIcon name="plus" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.primaryLight + '15',
              borderRadius: radius.md,
              marginHorizontal: spacing.base,
            },
          ]}>
          <Text style={[styles.infoText, {color: colors.text}]}>
            Templates let you add common transactions with one tap. Tap a template to open Add Transaction
            with its fields filled in.
          </Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={{paddingBottom: insets.bottom + 24}}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={{paddingHorizontal: spacing.base, gap: spacing.lg, paddingTop: spacing.base}}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
                YOUR TEMPLATES
              </Text>
              {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{marginVertical: 16}} />
              ) : userTemplates.length === 0 ? (
                <EmptyState
                  title="No custom templates"
                  message="Tap + above to create a template for transactions you add often."
                />
              ) : (
                <View style={styles.cardList}>
                  {renderTypeRows(userExpense, userIncome, true)}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
                BUILT-IN TEMPLATES
              </Text>
              <View style={styles.cardList}>{renderTypeRows(builtinExpense, builtinIncome, false)}</View>
            </View>

            <View style={[styles.statsCard, {backgroundColor: colors.surfaceElevated, borderRadius: radius.md}]}>
              <Text style={[styles.statsTitle, {color: colors.text}]}>Template stats</Text>
              <Text style={[styles.statsSubtitle, {color: colors.textTertiary}]}>
                {userTemplates.length} custom, {defaultTemplates.length} built-in
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: colors.primary}]}>{templates.length}</Text>
                  <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: colors.danger}]}>{expenseAll.length}</Text>
                  <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Expense</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: colors.success}]}>{incomeAll.length}</Text>
                  <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Income</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  headerAdd: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardList: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 4,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  deleteBtn: {
    padding: 8,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardName: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    fontSize: 12,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  useLabel: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  builtinBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  builtinBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  statsCard: {
    padding: 16,
    gap: 8,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  statsSubtitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
});
