import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout';
import {EmptyState} from '@presentation/components/feedback';
import {
  getDefaultTemplates,
  type TransactionTemplate,
} from '@domain/usecases/quick-action-templates';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';

function hexToAlpha(hex: string, alpha: string): string {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

export default function TemplateManagementScreen() {
  const navigation = useNavigation();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();

  const templates = useMemo(() => getDefaultTemplates(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const expenseTemplates = useMemo(
    () => templates.filter((t) => t.type === 'expense'),
    [templates],
  );
  const incomeTemplates = useMemo(
    () => templates.filter((t) => t.type === 'income'),
    [templates],
  );

  const renderTemplate = useCallback(
    (item: TransactionTemplate, idx: number) => {
      const isSelected = selectedId === item.id;
      return (
        <Animated.View
          entering={FadeInDown.delay(idx * 60).duration(300)}
          key={item.id}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedId(isSelected ? null : item.id)}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: isSelected ? colors.primary : colors.borderLight,
                borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                borderRadius: radius.md,
              },
              shadows.sm,
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                {backgroundColor: hexToAlpha(item.color, '22')},
              ]}
            >
              <AppIcon name={resolveIconName(item.icon)} size={20} color={item.color} />
            </View>

            <View style={styles.cardContent}>
              <Text
                style={[styles.cardName, {color: colors.text}]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={styles.cardMeta}>
                {item.categoryId && (
                  <Text
                    style={[styles.metaChip, {color: colors.textTertiary}]}
                    numberOfLines={1}
                  >
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
                      ]}
                    >
                      <Text style={[styles.tagLabel, {color: colors.primary}]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor:
                    item.type === 'income'
                      ? colors.successLight
                      : colors.dangerLight,
                  borderRadius: radius.xs,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color:
                      item.type === 'income' ? colors.success : colors.danger,
                  },
                ]}
              >
                {item.type}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      );
    },
    [colors, radius, shadows, selectedId],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View
          style={[
            styles.header,
            {paddingHorizontal: spacing.base, paddingTop: spacing.sm},
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <Text style={[styles.backBtn, {color: colors.primary}]}>Back</Text>
          </Pressable>
          <Text style={[typography.title3, {color: colors.text}]}>Quick Templates</Text>
          <View style={{width: 48}} />
        </View>

        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          style={[styles.infoCard, {backgroundColor: colors.primaryLight + '15', borderRadius: radius.md, marginHorizontal: spacing.base}]}
        >
          <Text style={[styles.infoText, {color: colors.text}]}>
            Templates let you add common transactions with one tap. Tap a template to see its details.
          </Text>
        </Animated.View>

        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={{paddingHorizontal: spacing.base, gap: spacing.lg, paddingTop: spacing.base}}>
              {expenseTemplates.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
                    EXPENSE SHORTCUTS
                  </Text>
                  <View style={styles.cardList}>
                    {expenseTemplates.map((t, i) => renderTemplate(t, i))}
                  </View>
                </View>
              )}

              {incomeTemplates.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
                    INCOME SHORTCUTS
                  </Text>
                  <View style={styles.cardList}>
                    {incomeTemplates.map((t, i) =>
                      renderTemplate(t, expenseTemplates.length + i),
                    )}
                  </View>
                </View>
              )}

              {templates.length === 0 && (
                <EmptyState
                  title="No templates yet"
                  message="Create quick templates to speed up adding common transactions."
                />
              )}

              <View style={[styles.statsCard, {backgroundColor: colors.surfaceElevated, borderRadius: radius.md}]}>
                <Text style={[styles.statsTitle, {color: colors.text}]}>Template Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, {color: colors.primary}]}>
                      {templates.length}
                    </Text>
                    <Text style={[styles.statLabel, {color: colors.textTertiary}]}>
                      Total
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, {color: colors.danger}]}>
                      {expenseTemplates.length}
                    </Text>
                    <Text style={[styles.statLabel, {color: colors.textTertiary}]}>
                      Expense
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, {color: colors.success}]}>
                      {incomeTemplates.length}
                    </Text>
                    <Text style={[styles.statLabel, {color: colors.textTertiary}]}>
                      Income
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          }
          contentContainerStyle={{paddingBottom: insets.bottom + 24}}
          showsVerticalScrollIndicator={false}
        />
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
  backBtn: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    minWidth: 48,
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
  cardList: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
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
    gap: 12,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
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
