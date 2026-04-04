import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import BottomSheet from '@gorhom/bottom-sheet';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {EmptyState} from '@presentation/components/feedback';
import {Chip} from '@presentation/components/common';
import {FilterSheet} from '@presentation/components/FilterSheet';
import {useSearch, SORT_OPTIONS, type SortOption, type SearchFilters} from '@presentation/hooks/useSearch';
import {useCategories} from '@presentation/hooks/useCategories';
import {useWallets} from '@presentation/hooks/useWallets';
import {
  addRecentSearch,
  getRecentSearches,
  clearRecentSearches,
} from '@domain/usecases/saved-filters';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';
import type {Transaction} from '@domain/entities/Transaction';
import type {TabParamList, TransactionsStackParamList} from '@presentation/navigation/types';

type SearchNav = CompositeNavigationProp<
  NativeStackNavigationProp<TransactionsStackParamList, 'Search'>,
  BottomTabNavigationProp<TabParamList>
>;

function categoryIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

function getCategoryDisplay(categoryId: string): {name: string; icon: string; color: string} {
  const found = DEFAULT_CATEGORIES.find((c) => categoryIdFromName(c.name) === categoryId);
  if (found) {
    return {name: found.name, icon: found.icon, color: found.color};
  }
  return {name: 'Other', icon: '...', color: '#B2BEC3'};
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) {
    return text;
  }
  return parts.map((part, i) =>
    regex.test(part)
      ? <Text key={i} style={styles.highlight}>{part}</Text>
      : part,
  );
}

function SortSheet({
  current,
  onSelect,
  visible,
  onClose,
}: {
  current: SortOption;
  onSelect: (s: SortOption) => void;
  visible: boolean;
  onClose: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  if (!visible) {
    return null;
  }
  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.sortOverlay,
        {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg},
      ]}
    >
      <Text style={[styles.sortTitle, {color: colors.text}]}>Sort by</Text>
      {SORT_OPTIONS.map((opt) => {
        const isActive = opt.field === current.field && opt.direction === current.direction;
        return (
          <Pressable
            key={`${opt.field}-${opt.direction}`}
            accessibilityRole="radio"
            accessibilityState={{selected: isActive}}
            onPress={() => {
              onSelect(opt);
              onClose();
            }}
            style={[
              styles.sortRow,
              {
                backgroundColor: isActive ? colors.primaryLight + '22' : 'transparent',
                borderRadius: radius.sm,
              },
            ]}
          >
            <View
              style={[
                styles.radioOuter,
                {borderColor: isActive ? colors.primary : colors.border},
              ]}
            >
              {isActive && (
                <View style={[styles.radioInner, {backgroundColor: colors.primary}]} />
              )}
            </View>
            <Text style={[styles.sortLabel, {color: isActive ? colors.primary : colors.text}]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const filterRef = useRef<BottomSheet>(null);
  const inputRef = useRef<TextInput>(null);

  const {
    query,
    setQuery,
    results,
    resultCount,
    isSearching,
    filters,
    setFilters,
    activeFilterCount,
    sort,
    setSort,
    clearAll,
    hasActiveSearch,
  } = useSearch();

  const {categories} = useCategories();
  const {wallets} = useWallets();

  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
  const [showSort, setShowSort] = useState(false);

  const searchBarFocus = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 350);
  }, []);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
    }
    Keyboard.dismiss();
  }, [query]);

  const handleRecentPress = useCallback((term: string) => {
    setQuery(term);
    addRecentSearch(term);
    setRecentSearches(getRecentSearches());
  }, [setQuery]);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const openFilters = useCallback(() => {
    Keyboard.dismiss();
    filterRef.current?.expand();
  }, []);

  const handleApplyFilters = useCallback((f: SearchFilters) => {
    setFilters(f);
  }, [setFilters]);

  const openDetail = useCallback(
    (id: string) => {
      navigation.navigate('HomeTab', {
        screen: 'TransactionDetail',
        params: {transactionId: id},
      });
    },
    [navigation],
  );

  const openEdit = useCallback(
    (id: string) => {
      navigation.navigate('EditTransaction', {transactionId: id});
    },
    [navigation],
  );

  const searchBarStyle = useAnimatedStyle(() => ({
    borderColor: searchBarFocus.value > 0.5 ? colors.primary : colors.border,
    borderWidth: searchBarFocus.value > 0.5 ? 2 : 1,
  }));

  const activeChips = useMemo(() => {
    const chips: {key: string; label: string; onClear: () => void}[] = [];
    if (filters.type) {
      const label = filters.type.charAt(0).toUpperCase() + filters.type.slice(1);
      chips.push({key: 'type', label, onClear: () => setFilters({...filters, type: undefined})});
    }
    if (filters.source) {
      const label = filters.source.charAt(0).toUpperCase() + filters.source.slice(1);
      chips.push({key: 'source', label: `Source: ${label}`, onClear: () => setFilters({...filters, source: undefined})});
    }
    if (filters.categoryId) {
      const cat = getCategoryDisplay(filters.categoryId);
      chips.push({key: 'cat', label: cat.name, onClear: () => setFilters({...filters, categoryId: undefined})});
    }
    if (filters.walletId) {
      const w = wallets.find((wal) => wal.id === filters.walletId);
      chips.push({
        key: 'wallet',
        label: w ? w.name : 'Wallet',
        onClear: () => setFilters({...filters, walletId: undefined}),
      });
    }
    if (filters.dateRange) {
      chips.push({key: 'date', label: 'Date range', onClear: () => setFilters({...filters, dateRange: undefined})});
    }
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      const min = filters.minAmount !== undefined ? `$${(filters.minAmount / 100).toFixed(0)}` : '...';
      const max = filters.maxAmount !== undefined ? `$${(filters.maxAmount / 100).toFixed(0)}` : '...';
      chips.push({
        key: 'amount',
        label: `${min} - ${max}`,
        onClear: () => setFilters({...filters, minAmount: undefined, maxAmount: undefined}),
      });
    }
    if (filters.tags && filters.tags.length > 0) {
      chips.push({
        key: 'tags',
        label: `Tags: ${filters.tags.join(', ')}`,
        onClear: () => setFilters({...filters, tags: undefined}),
      });
    }
    return chips;
  }, [filters, setFilters, wallets]);

  const renderItem = useCallback(
    ({item}: {item: Transaction}) => {
      const cat = getCategoryDisplay(item.categoryId);
      return (
        <View style={{paddingHorizontal: spacing.base, paddingBottom: spacing.sm}}>
          <TransactionCard
            amount={item.amount}
            categoryColor={cat.color}
            categoryIcon={cat.icon}
            categoryName={cat.name}
            currency={item.currency}
            description={
              query.trim()
                ? String(item.description || item.merchant || 'Transaction')
                : item.description
            }
            id={item.id}
            merchant={item.merchant}
            source={item.source}
            transactionDate={item.transactionDate}
            type={item.type}
            onEdit={openEdit}
            onPress={openDetail}
          />
        </View>
      );
    },
    [query, openDetail, openEdit, spacing.base, spacing.sm],
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const showRecentSearches = !hasActiveSearch && recentSearches.length > 0;
  const showEmptyResults = hasActiveSearch && !isSearching && resultCount === 0;
  const showInitialHint = !hasActiveSearch && recentSearches.length === 0;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      {/* Search header */}
      <View
        style={[
          styles.searchHeader,
          {
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.base,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Text style={[styles.backArrow, {color: colors.text}]}>{'<'}</Text>
        </Pressable>

        <Animated.View
          style={[
            styles.searchBarWrap,
            {borderRadius: radius.md, backgroundColor: colors.surfaceElevated},
            searchBarStyle,
          ]}
        >
          <Text style={[styles.searchIcon, {color: colors.textTertiary}]}>
            {isSearching ? '' : ''}
          </Text>
          {isSearching && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          )}
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, {color: colors.text}]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            onFocus={() => { searchBarFocus.value = withTiming(1, {duration: 200}); }}
            onBlur={() => { searchBarFocus.value = withTiming(0, {duration: 200}); }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <Text style={[styles.clearIcon, {color: colors.textTertiary}]}>x</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>

      {/* Toolbar row: filter + sort + result count */}
      <View
        style={[
          styles.toolbar,
          {
            paddingHorizontal: spacing.base,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={openFilters}
          style={[
            styles.toolBtn,
            {
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
              borderRadius: radius.sm,
              backgroundColor: activeFilterCount > 0 ? colors.primaryLight + '22' : colors.surfaceElevated,
            },
          ]}
        >
          <Text style={{color: activeFilterCount > 0 ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: fontWeight.semibold}}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowSort(!showSort)}
          style={[
            styles.toolBtn,
            {
              borderColor: colors.border,
              borderRadius: radius.sm,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <Text style={{color: colors.textSecondary, fontSize: 13, fontWeight: fontWeight.semibold}}>
            {sort.label}
          </Text>
        </Pressable>

        <View style={{flex: 1}} />

        {hasActiveSearch && (
          <Animated.Text
            entering={FadeIn.duration(200)}
            style={[styles.resultCount, {color: colors.textTertiary}]}
          >
            {isSearching ? 'Searching...' : `${resultCount} result${resultCount !== 1 ? 's' : ''}`}
          </Animated.Text>
        )}
      </View>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <View
          style={[
            styles.chipBar,
            {paddingHorizontal: spacing.base, backgroundColor: colors.surface, borderBottomColor: colors.border},
          ]}
        >
          {activeChips.map((chip) => (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              onPress={chip.onClear}
              style={[
                styles.activeChip,
                {backgroundColor: colors.primaryLight + '22', borderRadius: radius.full, borderColor: colors.primary + '44'},
              ]}
            >
              <Text style={[styles.activeChipLabel, {color: colors.primary}]}>{chip.label}</Text>
              <Text style={[styles.activeChipX, {color: colors.primary}]}>x</Text>
            </Pressable>
          ))}
          {activeFilterCount > 1 && (
            <Pressable accessibilityRole="button" onPress={() => setFilters({})}>
              <Text style={[styles.clearAllLabel, {color: colors.danger}]}>Clear all</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Content area */}
      {showInitialHint && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.hintContainer}>
          <EmptyState
            title="Search your transactions"
            message="Type a merchant name, description, or note. Use filters to narrow results by date, amount, category, and more."
          />
        </Animated.View>
      )}

      {showRecentSearches && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.recentContainer, {paddingHorizontal: spacing.base}]}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, {color: colors.text}]}>Recent searches</Text>
            <Pressable accessibilityRole="button" onPress={handleClearRecent}>
              <Text style={[styles.recentClear, {color: colors.textTertiary}]}>Clear</Text>
            </Pressable>
          </View>
          {recentSearches.slice(0, 8).map((term, idx) => (
            <Pressable
              key={`${term}-${idx}`}
              accessibilityRole="button"
              onPress={() => handleRecentPress(term)}
              style={({pressed}) => [
                styles.recentRow,
                {
                  borderBottomColor: colors.borderLight,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.recentIcon, {color: colors.textTertiary}]}>{'<'}</Text>
              <Text style={[styles.recentLabel, {color: colors.text}]} numberOfLines={1}>
                {term}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      )}

      {showEmptyResults && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.hintContainer}>
          <EmptyState
            title="No results found"
            message={`No transactions match "${query.trim() || 'your filters'}". Try adjusting your search or filters.`}
            actionLabel="Clear all"
            onAction={clearAll}
          />
        </Animated.View>
      )}

      {hasActiveSearch && resultCount > 0 && (
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Sort dropdown */}
      <SortSheet
        current={sort}
        onSelect={setSort}
        visible={showSort}
        onClose={() => setShowSort(false)}
      />

      {/* Filter bottom sheet */}
      <FilterSheet
        ref={filterRef}
        filters={filters}
        onApply={handleApplyFilters}
        categories={categories}
        wallets={wallets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  spinner: {
    position: 'absolute',
    left: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    height: 42,
  },
  clearIcon: {
    fontSize: 16,
    fontWeight: '700',
    padding: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
  },
  activeChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeChipX: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearAllLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  hintContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  recentContainer: {
    paddingTop: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentClear: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  recentIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentLabel: {
    flex: 1,
    fontSize: 15,
  },
  highlight: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  sortOverlay: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    zIndex: 999,
    elevation: 10,
  },
  sortTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
