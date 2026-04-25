import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  SectionList,
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
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {EmptyState} from '@presentation/components/feedback';
import {BackButton} from '@presentation/components/common';
import {
  UNIVERSAL_SORT_OPTIONS,
  useUniversalSearch,
  type UniversalSortOption,
} from '@presentation/hooks/useUniversalSearch';
import {useSearchSuggestions, type SearchSuggestion} from '@presentation/hooks/useSearchSuggestions';
import {useCategories} from '@presentation/hooks/useCategories';
import {useWallets} from '@presentation/hooks/useWallets';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {
  addRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  loadSavedData,
} from '@domain/usecases/recent-searches';
import {emitSearchEvent} from '@shared/analytics/searchEvents';
import {HighlightedText} from '@presentation/components/search/HighlightedText';
import {SearchSectionHeader} from '@presentation/components/search/SearchSectionHeader';
import {SuggestionRow} from '@presentation/components/search/SuggestionRow';
import {SmartListsSection, type SmartList} from '@presentation/components/search/SmartListsSection';
import type {ResolveCtx} from '@domain/usecases/search/parseSearchQuery';
import type {Transaction} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import type {Category} from '@domain/entities/Category';
import type {Budget} from '@domain/entities/Budget';
import type {TabParamList, TransactionsStackParamList} from '@presentation/navigation/types';
import type {GroupedSearchResults} from '@data/repositories/UniversalSearchRepository';
import {useTransactionSelectionStore} from '@presentation/stores/useTransactionSelectionStore';
import {TransactionBulkActionsHost} from '@presentation/components/transactions/TransactionBulkActionsHost';

type SearchNav = CompositeNavigationProp<
  NativeStackNavigationProp<TransactionsStackParamList, 'Search'>,
  BottomTabNavigationProp<TabParamList>
>;

function SortSheet({
  current,
  onSelect,
  visible,
  onClose,
}: {
  current: UniversalSortOption;
  onSelect: (s: UniversalSortOption) => void;
  visible: boolean;
  onClose: () => void;
}) {
  const {colors, radius} = useTheme();
  if (!visible) { return null; }
  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.sortOverlay,
        {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg},
      ]}>
      <Text style={[styles.sortTitle, {color: colors.text}]}>Sort by</Text>
      {UNIVERSAL_SORT_OPTIONS.map((opt) => {
        const isActive = opt.field === current.field && opt.direction === current.direction;
        return (
          <Pressable
            key={`${opt.field}-${opt.direction}`}
            accessibilityRole="radio"
            accessibilityState={{selected: isActive}}
            onPress={() => { onSelect(opt); onClose(); }}
            style={[
              styles.sortRow,
              {
                backgroundColor: isActive ? colors.primaryLight + '22' : 'transparent',
                borderRadius: radius.sm,
              },
            ]}>
            <View
              style={[
                styles.radioOuter,
                {borderColor: isActive ? colors.primary : colors.border},
              ]}>
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

type SectionItem =
  | {kind: 'transaction'; id: string; transaction: Transaction}
  | {kind: 'wallet'; id: string; wallet: Wallet}
  | {kind: 'category'; id: string; category: Category}
  | {kind: 'budget'; id: string; budget: Budget}
  | {kind: 'suggestion'; id: string; suggestion: SearchSuggestion}
  | {kind: 'recent'; id: string; label: string};

type Section = {
  title: string;
  kind: SectionItem['kind'];
  data: SectionItem[];
  count: number;
  clearable?: () => void;
};

export default function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const {categories} = useCategories();
  const {wallets} = useWallets();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const isSelecting = useTransactionSelectionStore((s) => s.isSelecting);
  const selectedIds = useTransactionSelectionStore((s) => s.selectedIds);
  const toggleSelected = useTransactionSelectionStore((s) => s.toggleSelected);

  const resolveCtx = useMemo<ResolveCtx>(
    () => ({
      wallets: wallets.map((w) => ({id: w.id, name: w.name, currency: w.currency})),
      categories: categories.map((c) => ({id: c.id, name: c.name, type: c.type})),
    }),
    [wallets, categories],
  );

  const search = useUniversalSearch({ctx: resolveCtx});
  const suggestions = useSearchSuggestions(search.raw);

  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
  const [showSort, setShowSort] = useState(false);
  const searchBarFocus = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadSavedData();
      if (!cancelled) {
        setRecentSearches(getRecentSearches());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = search.raw.trim();
    if (trimmed) {
      addRecentSearch(trimmed);
      setRecentSearches(getRecentSearches());
    }
    Keyboard.dismiss();
  }, [search.raw]);

  const handleRecentPress = useCallback((term: string) => {
    search.setRaw(term);
    addRecentSearch(term);
    setRecentSearches(getRecentSearches());
  }, [search]);

  const handleSuggestionPress = useCallback((suggestion: SearchSuggestion) => {
    const tokens = search.raw.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) { tokens.pop(); }
    tokens.push(suggestion.token);
    search.setRaw(tokens.join(' ') + (suggestion.token.endsWith(':') ? '' : ' '));
    inputRef.current?.focus();
  }, [search]);

  const handleSmartListPress = useCallback((list: SmartList) => {
    if (list.id === 'sl-duplicates') {
      navigation.navigate('DuplicateCleanup');
      return;
    }
    search.setRaw(list.query);
    inputRef.current?.focus();
  }, [navigation, search]);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const openTransactionDetail = useCallback(
    (id: string) => {
      emitSearchEvent('search_result_opened', {entity: 'transaction'});
      navigation.navigate('HomeTab', {
        screen: 'TransactionDetail',
        params: {transactionId: id},
      });
    },
    [navigation],
  );

  const openWalletDetail = useCallback(
    (walletId: string) => {
      emitSearchEvent('search_result_opened', {entity: 'wallet'});
      navigation.navigate('WalletsTab', {
        screen: 'WalletDetail',
        params: {walletId},
      });
    },
    [navigation],
  );

  const openTransactionsForCategory = useCallback(
    (categoryId: string) => {
      emitSearchEvent('search_result_opened', {entity: 'category'});
      navigation.navigate('TransactionsTab', {
        screen: 'TransactionsList',
        params: {filterCategoryId: categoryId},
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

  const getCategoryDisplay = useCallback(
    (categoryId: string) => {
      const found = categories.find((c) => c.id === categoryId);
      if (found) { return {name: found.name, icon: found.icon, color: found.color}; }
      return {name: 'Other', icon: '...', color: '#B2BEC3'};
    },
    [categories],
  );

  const highlightNeedles = useMemo(
    () => [search.parsed.text, ...search.parsed.phrases].filter(Boolean),
    [search.parsed],
  );

  const sections: Section[] = useMemo(() => {
    const out: Section[] = [];

    if (!search.hasActiveSearch) {
      if (recentSearches.length > 0) {
        out.push({
          title: 'Recent searches',
          kind: 'recent',
          count: recentSearches.length,
          data: recentSearches.slice(0, 8).map((term, idx) => ({
            kind: 'recent', id: `${term}-${idx}`, label: term,
          })),
          clearable: handleClearRecent,
        });
      }
      return out;
    }

    if (suggestions.length > 0 && search.raw.length > 0 && search.status !== 'searching') {
      out.push({
        title: 'Suggestions',
        kind: 'suggestion',
        count: suggestions.length,
        data: suggestions.map((s) => ({kind: 'suggestion', id: s.id, suggestion: s})),
      });
    }

    const r: GroupedSearchResults = search.results;
    if (r.transactions.length > 0) {
      out.push({
        title: 'Transactions',
        kind: 'transaction',
        count: r.transactions.length,
        data: r.transactions.map((res) => ({
          kind: 'transaction', id: res.id, transaction: res.transaction,
        })),
      });
    }
    if (r.wallets.length > 0) {
      out.push({
        title: 'Wallets',
        kind: 'wallet',
        count: r.wallets.length,
        data: r.wallets.map((res) => ({kind: 'wallet', id: res.id, wallet: res.wallet})),
      });
    }
    if (r.categories.length > 0) {
      out.push({
        title: 'Categories',
        kind: 'category',
        count: r.categories.length,
        data: r.categories.map((res) => ({kind: 'category', id: res.id, category: res.category})),
      });
    }
    if (r.budgets.length > 0) {
      out.push({
        title: 'Budgets',
        kind: 'budget',
        count: r.budgets.length,
        data: r.budgets.map((res) => ({kind: 'budget', id: res.id, budget: res.budget})),
      });
    }
    return out;
  }, [search.hasActiveSearch, search.raw, search.status, search.results, recentSearches, suggestions, handleClearRecent]);

  const renderItem = useCallback(({item}: {item: SectionItem}) => {
    switch (item.kind) {
      case 'transaction': {
        const t = item.transaction;
        const cat = getCategoryDisplay(t.categoryId);
        return (
          <View style={{paddingHorizontal: spacing.base, paddingBottom: spacing.sm}}>
            <TransactionCard
              amount={t.amount}
              categoryColor={cat.color}
              categoryIcon={cat.icon}
              categoryName={cat.name}
              currency={t.currency}
              description={String(t.description || t.merchant || 'Transaction')}
              id={t.id}
              merchant={t.merchant}
              notes={t.notes}
              source={t.source}
              transactionDate={t.transactionDate}
              type={t.type}
              hideAmounts={hideAmounts}
              selectable={isSelecting}
              selected={selectedIds.includes(t.id)}
              onToggleSelected={toggleSelected}
              onEdit={openEdit}
              onLongPress={toggleSelected}
              onPress={openTransactionDetail}
            />
          </View>
        );
      }
      case 'wallet':
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open wallet ${item.wallet.name}`}
            onPress={() => openWalletDetail(item.wallet.id)}
            style={({pressed}) => [
              styles.rowCard,
              {
                backgroundColor: pressed ? colors.border : colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.md,
                marginHorizontal: spacing.base,
                marginBottom: spacing.sm,
              },
            ]}>
            <View style={[styles.pill, {backgroundColor: colors.primary + '22'}]}>
              <Text style={[styles.pillText, {color: colors.primary}]}>
                {item.wallet.currency}
              </Text>
            </View>
            <HighlightedText
              text={item.wallet.name}
              needles={highlightNeedles}
              style={[styles.rowTitle, {color: colors.text}]}
              numberOfLines={1}
            />
          </Pressable>
        );
      case 'category':
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See transactions in ${item.category.name}`}
            onPress={() => openTransactionsForCategory(item.category.id)}
            style={({pressed}) => [
              styles.rowCard,
              {
                backgroundColor: pressed ? colors.border : colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.md,
                marginHorizontal: spacing.base,
                marginBottom: spacing.sm,
              },
            ]}>
            <View style={[styles.pill, {backgroundColor: item.category.color + '33'}]}>
              <Text style={[styles.pillText, {color: item.category.color}]}>
                {item.category.icon}
              </Text>
            </View>
            <HighlightedText
              text={item.category.name}
              needles={highlightNeedles}
              style={[styles.rowTitle, {color: colors.text}]}
              numberOfLines={1}
            />
            <Text style={[styles.rowSubtitle, {color: colors.textTertiary}]}>
              {item.category.type}
            </Text>
          </Pressable>
        );
      case 'budget':
        return (
          <View
            style={[
              styles.rowCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.md,
                marginHorizontal: spacing.base,
                marginBottom: spacing.sm,
              },
            ]}>
            <View style={[styles.pill, {backgroundColor: colors.warningLight}]}>
              <Text style={[styles.pillText, {color: colors.warning}]}>
                {item.budget.currency}
              </Text>
            </View>
            <Text style={[styles.rowTitle, {color: colors.text}]} numberOfLines={1}>
              Budget · {item.budget.period}
            </Text>
          </View>
        );
      case 'suggestion':
        return (
          <SuggestionRow suggestion={item.suggestion} onPress={handleSuggestionPress} />
        );
      case 'recent':
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => handleRecentPress(item.label)}
            style={({pressed}) => [
              styles.recentRow,
              {
                borderBottomColor: colors.borderLight,
                paddingHorizontal: spacing.lg,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text style={[styles.recentIcon, {color: colors.textTertiary}]}>↺</Text>
            <Text style={[styles.recentLabel, {color: colors.text}]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
    }
  }, [
    colors, spacing, radius, highlightNeedles, hideAmounts, isSelecting, selectedIds,
    openEdit, openTransactionDetail, openWalletDetail, openTransactionsForCategory,
    handleSuggestionPress, handleRecentPress, getCategoryDisplay, toggleSelected,
  ]);

  const renderSectionHeader = useCallback(({section}: {section: Section}) => (
    <SearchSectionHeader title={section.title} count={section.count} />
  ), []);

  const listHeader = useMemo(() => (
    <View>
      {search.usingOfflineIndex && (
        <View
          style={[
            styles.offlineBanner,
            {backgroundColor: colors.warningLight, borderColor: colors.warning},
          ]}>
          <Text style={[styles.offlineText, {color: colors.warning}]}>
            Showing offline results — reconnect for the full search.
          </Text>
        </View>
      )}
      {!search.hasActiveSearch && (
        <SmartListsSection onSelect={handleSmartListPress} />
      )}
    </View>
  ), [search.usingOfflineIndex, search.hasActiveSearch, colors, handleSmartListPress]);

  const listEmpty = useMemo(() => {
    if (search.status === 'searching') { return null; }
    if (search.status === 'empty') {
      return (
        <View style={styles.hintContainer}>
          <EmptyState
            title="No results found"
            message={`Nothing matches "${search.raw.trim() || 'your search'}". Try a different query.`}
            actionLabel="Clear"
            onAction={search.clearAll}
          />
        </View>
      );
    }
    if (!search.hasActiveSearch && recentSearches.length === 0) {
      return (
        <View style={styles.hintContainer}>
          <EmptyState
            title="Search everything"
            message="Find transactions, wallets, categories, and budgets. Type any keyword, or use shortcuts like category:food or date:last-month."
          />
        </View>
      );
    }
    return null;
  }, [search.status, search.raw, search.hasActiveSearch, search.clearAll, recentSearches.length]);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.searchHeader,
          {
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.base,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}>
        <BackButton onPress={handleBack} />

        <Animated.View
          style={[
            styles.searchBarWrap,
            {borderRadius: radius.md, backgroundColor: colors.surfaceElevated},
            searchBarStyle,
          ]}>
          {search.status === 'searching' ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          ) : (
            <Text style={[styles.searchIcon, {color: colors.textTertiary}]}>⌕</Text>
          )}
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, {color: colors.text}]}
            value={search.raw}
            onChangeText={search.setRaw}
            placeholder="Search transactions, wallets, categories..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            onFocus={() => { searchBarFocus.value = withTiming(1, {duration: 200}); }}
            onBlur={() => { searchBarFocus.value = withTiming(0, {duration: 200}); }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.raw.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => search.setRaw('')}
              hitSlop={8}>
              <Text style={[styles.clearIcon, {color: colors.textTertiary}]}>×</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>

      <View
        style={[
          styles.toolbar,
          {
            paddingHorizontal: spacing.base,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}>
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
          ]}>
          <Text style={{color: colors.textSecondary, fontSize: 13, fontWeight: fontWeight.semibold}}>
            {search.sort.label}
          </Text>
        </Pressable>

        <View style={{flex: 1}} />

        {search.hasActiveSearch && (
          <Animated.Text
            entering={FadeIn.duration(200)}
            style={[styles.resultCount, {color: colors.textTertiary}]}>
            {search.status === 'searching'
              ? 'Searching...'
              : `${search.totalCount} result${search.totalCount !== 1 ? 's' : ''}`}
          </Animated.Text>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        onEndReachedThreshold={0.5}
        onEndReached={search.loadMore}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />

      <SortSheet
        current={search.sort}
        onSelect={search.setSort}
        visible={showSort}
        onClose={() => setShowSort(false)}
      />

      <TransactionBulkActionsHost
        visibleIds={search.results.transactions.map((result) => result.transaction.id)}
        categories={categories}
        onComplete={search.refresh}
        bottomOffset={insets.bottom + 16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {fontSize: 16},
  spinner: {position: 'absolute', left: 14},
  searchInput: {flex: 1, fontSize: 15, paddingVertical: 0, height: 42},
  clearIcon: {fontSize: 18, fontWeight: '700', padding: 4},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: {borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6},
  resultCount: {fontSize: 12, fontWeight: '500'},
  hintContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  recentIcon: {fontSize: 14, fontWeight: '600'},
  recentLabel: {flex: 1, fontSize: 15},
  sortOverlay: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    zIndex: 999,
    elevation: 10,
  },
  sortTitle: {fontSize: 16, fontWeight: '600', marginBottom: 8},
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
  radioInner: {width: 10, height: 10, borderRadius: 5},
  sortLabel: {fontSize: 14, fontWeight: '500'},
  offlineBanner: {
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  offlineText: {fontSize: 13, fontWeight: '600'},
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {fontSize: 12, fontWeight: '700'},
  rowTitle: {flex: 1, fontSize: 15, fontWeight: '600'},
  rowSubtitle: {fontSize: 12, fontWeight: '500'},
});
