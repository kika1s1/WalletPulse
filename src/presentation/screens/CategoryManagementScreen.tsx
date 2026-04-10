import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {useCategories} from '@presentation/hooks/useCategories';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeArchiveCategory} from '@domain/usecases/archive-category';
import type {Category} from '@domain/entities/Category';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {BackButton} from '@presentation/components/common';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CategoryManagement'>;
type Tab = 'expense' | 'income';

function hexWithAlpha(hex: string, alpha: string): string {
  if (hex.length === 7 && hex.startsWith('#')) {
    return `${hex}${alpha}`;
  }
  return hex;
}

function CategoryRow({
  cat,
  onEdit,
  onArchive,
}: {
  cat: Category;
  onEdit: (id: string) => void;
  onArchive: (id: string, name: string) => void;
}) {
  const {colors, spacing, radius} = useTheme();

  return (
    <View
      style={[
        styles.catRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderRadius: radius.md,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
        },
      ]}>
      <View
        style={[
          styles.catIcon,
          {backgroundColor: hexWithAlpha(cat.color, '22')},
        ]}>
        <AppIcon name={resolveIconName(cat.icon)} size={20} color={cat.color} />
      </View>

      <View style={styles.catCenter}>
        <Text numberOfLines={1} style={[styles.catName, {color: colors.text}]}>
          {cat.name}
        </Text>
        <View style={styles.catMeta}>
          <View
            style={[
              styles.typeBadge,
              {backgroundColor: hexWithAlpha(cat.color, '18')},
            ]}>
            <Text style={[styles.typeBadgeText, {color: cat.color}]}>
              {cat.type}
            </Text>
          </View>
          {cat.isDefault && (
            <Text style={[styles.defaultLabel, {color: colors.textTertiary}]}>
              Default
            </Text>
          )}
        </View>
      </View>

      <View style={styles.catActions}>
        <Pressable
          accessibilityLabel={`Edit ${cat.name}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onEdit(cat.id)}
          style={({pressed}) => [
            styles.actionBtn,
            {
              backgroundColor: colors.primaryLight + '20',
              borderRadius: 10,
              opacity: pressed ? 0.6 : 1,
            },
          ]}>
          <MaterialCommunityIcons color={colors.primary} name="pencil-outline" size={18} />
          <Text style={[styles.actionLabel, {color: colors.primary}]}>Edit</Text>
        </Pressable>

        {!cat.isDefault && (
          <Pressable
            accessibilityLabel={`Archive ${cat.name}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onArchive(cat.id, cat.name)}
            style={({pressed}) => [
              styles.actionBtn,
              {
                backgroundColor: colors.dangerLight,
                borderRadius: 10,
                opacity: pressed ? 0.6 : 1,
              },
            ]}>
            <MaterialCommunityIcons color={colors.danger} name="archive-outline" size={18} />
            <Text style={[styles.actionLabel, {color: colors.danger}]}>Archive</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function CategoryManagementScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<Nav>();
  const {categories, isLoading, error, refetch} = useCategories();
  const [tab, setTab] = useState<Tab>('expense');

  const filtered = useMemo(() => {
    return categories.filter((c) => c.type === tab || c.type === 'both');
  }, [categories, tab]);

  const counts = useMemo(
    () => ({
      expense: categories.filter((c) => c.type === 'expense' || c.type === 'both').length,
      income: categories.filter((c) => c.type === 'income' || c.type === 'both').length,
    }),
    [categories],
  );

  const handleEdit = useCallback(
    (id: string) => {
      navigation.navigate('CreateCategory', {editCategoryId: id});
    },
    [navigation],
  );

  const handleArchive = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Archive Category',
        `Are you sure you want to archive "${name}"? It will no longer appear in pickers but existing transactions will keep their category.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Archive',
            style: 'destructive',
            onPress: async () => {
              try {
                const ds = getLocalDataSource();
                const archive = makeArchiveCategory({categoryRepo: ds.categories});
                await archive(id);
                refetch();
              } catch (e) {
                Alert.alert(
                  'Error',
                  e instanceof Error ? e.message : 'Failed to archive',
                );
              }
            },
          },
        ],
      );
    },
    [refetch],
  );

  const renderItem = useCallback(
    ({item}: {item: Category}) => (
      <CategoryRow cat={item} onArchive={handleArchive} onEdit={handleEdit} />
    ),
    [handleArchive, handleEdit],
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  const tabs: {key: Tab; label: string; count: number}[] = [
    {key: 'expense', label: 'Expense', count: counts.expense},
    {key: 'income', label: 'Income', count: counts.income},
  ];

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
            paddingTop: insets.top + 12,
          },
        ]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            Categories
          </Text>
          <Pressable
            accessibilityLabel="Add category"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.navigate('CreateCategory')}>
            <Text style={[styles.addBtn, {color: colors.primary}]}>+ New</Text>
          </Pressable>
        </View>

        <View style={[styles.tabRow, {gap: spacing.sm}]}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{selected: active}}
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active ? colors.primary : colors.background,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radius.full,
                  },
                ]}>
                <Text
                  style={[
                    styles.tabLabel,
                    {color: active ? '#FFFFFF' : colors.textSecondary},
                  ]}>
                  {t.label}
                </Text>
                <Text
                  style={[
                    styles.tabCount,
                    {color: active ? '#FFFFFF' : colors.textTertiary},
                  ]}>
                  {t.count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading && categories.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading categories...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppIcon name="alert-circle-outline" size={40} color={colors.danger} />
          <Text style={[styles.errorTitle, {color: colors.text}]}>
            Failed to load
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={refetch}
            style={[styles.retryBtn, {backgroundColor: colors.primary, borderRadius: radius.sm}]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <AppIcon name="tag-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, {color: colors.text}]}>
            No {tab} categories
          </Text>
          <Text style={[styles.emptyMsg, {color: colors.textSecondary}]}>
            Create a new category to organize your transactions.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            padding: spacing.base,
            gap: spacing.sm,
            paddingBottom: insets.bottom + 24,
          }}
          data={filtered}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={refetch}
              refreshing={isLoading}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  addBtn: {fontSize: 16, fontWeight: fontWeight.semibold},
  tabRow: {flexDirection: 'row'},
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  tabLabel: {fontSize: 14, fontWeight: fontWeight.medium},
  tabCount: {fontSize: 12},
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  catIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconText: {fontSize: 20},
  catCenter: {flex: 1, minWidth: 0, gap: 4},
  catName: {fontSize: 15, fontWeight: fontWeight.semibold},
  catMeta: {flexDirection: 'row', alignItems: 'center', gap: 8},
  typeBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8},
  typeBadgeText: {fontSize: 11, fontWeight: fontWeight.semibold, textTransform: 'capitalize'},
  defaultLabel: {fontSize: 11},
  catActions: {flexDirection: 'row', gap: 8},
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionLabel: {fontSize: 13, fontWeight: fontWeight.semibold},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32},
  loadingText: {fontSize: 14, marginTop: 12},
  errorEmoji: {fontSize: 40},
  errorTitle: {fontSize: 18, fontWeight: fontWeight.semibold, marginTop: 12},
  retryBtn: {marginTop: 16, paddingHorizontal: 24, paddingVertical: 10},
  retryText: {color: '#FFFFFF', fontSize: 14, fontWeight: fontWeight.semibold},
  emptyEmoji: {fontSize: 48},
  emptyTitle: {fontSize: 18, fontWeight: fontWeight.semibold, marginTop: 12},
  emptyMsg: {fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 6},
});
