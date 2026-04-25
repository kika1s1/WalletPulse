import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
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
import BottomSheet from '@gorhom/bottom-sheet';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {EmptyState} from '@presentation/components/feedback';
import {BackButton} from '@presentation/components/common';
import {FilterSheet} from '@presentation/components/FilterSheet';
import {
  UNIVERSAL_SORT_OPTIONS,
  useUniversalSearch,
  type UniversalSortOption,
} from '@presentation/hooks/useUniversalSearch';
import {useSearchSuggestions, type SearchSuggestion} from '@presentation/hooks/useSearchSuggestions';
import type {SearchFilters as UniversalFilters} from '@data/repositories/UniversalSearchRepository';
import {useCategories} from '@presentation/hooks/useCategories';
import {useWallets} from '@presentation/hooks/useWallets';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {
  addRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  loadSavedData,
  getSavedFilters,
  addSavedFilter,
  removeSavedFilter,
  renameSavedFilter,
  suggestSavedFilterName,
  toggleSavedFilterPin,
  type SavedFilter,
} from '@domain/usecases/saved-filters';
import {emitSearchEvent} from '@shared/analytics/searchEvents';
import {HighlightedText} from '@presentation/components/search/HighlightedText';
import {SearchSectionHeader} from '@presentation/components/search/SearchSectionHeader';
import {SuggestionRow} from '@presentation/components/search/SuggestionRow';
import {SmartListsSection, type SmartList} from '@presentation/components/search/SmartListsSection';
import type {ResolveCtx} from '@domain/usecases/search/parseSearchQuery';
import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';
import type {Transaction} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import type {Category} from '@domain/entities/Category';
import type {Budget} from '@domain/entities/Budget';
import type {TabParamList, TransactionsStackParamList} from '@presentation/navigation/types';
import type {GroupedSearchResults} from '@data/repositories/UniversalSearchRepository';
import {useTagSuggestions} from '@presentation/hooks/useTagSuggestions';
import {useTransactionSelectionStore} from '@presentation/stores/useTransactionSelectionStore';
import {TransactionBulkActionsHost} from '@presentation/components/transactions/TransactionBulkActionsHost';

type SearchNav = CompositeNavigationProp<
  NativeStackNavigationProp<TransactionsStackParamList, 'Search'>,
  BottomTabNavigationProp<TabParamList>
>;

// Mirrors the old `useSearch`'s SearchFilters shape so FilterSheet and
// saved-presets (which still pass TransactionFilter) continue to work.
type LegacyFilters = {
  type?: TransactionFilter['type'];
  source?: TransactionFilter['source'];
  categoryId?: string;
  walletId?: string;
  currency?: string;
  merchant?: string;
  minAmount?: number;
  maxAmount?: number;
  dateRange?: {startMs: number; endMs: number};
  tags?: string[];
  hasReceipt?: boolean;
  hasNotes?: boolean;
  hasLocation?: boolean;
  hasTags?: boolean;
  isRecurring?: boolean;
  isTemplate?: boolean;
  isUncategorized?: boolean;
};

function legacyToUniversal(f: LegacyFilters): UniversalFilters {
  const out: UniversalFilters = {};
  if (f.type) { out.type = f.type; }
  if (f.source) { out.source = f.source; }
  if (f.categoryId) { out.categoryId = f.categoryId; }
  if (f.walletId) { out.walletId = f.walletId; }
  if (f.currency) { out.currency = f.currency; }
  if (f.merchant) { out.merchant = f.merchant; }
  if (f.minAmount !== undefined) { out.minAmount = f.minAmount; }
  if (f.maxAmount !== undefined) { out.maxAmount = f.maxAmount; }
  if (f.dateRange) {
    out.startMs = f.dateRange.startMs;
    out.endMs = f.dateRange.endMs;
  }
  if (f.tags && f.tags.length > 0) { out.tags = f.tags; }
  if (f.hasReceipt) { out.hasReceipt = true; }
  if (f.hasNotes) { out.hasNotes = true; }
  if (f.hasLocation) { out.hasLocation = true; }
  if (f.hasTags) { out.hasTags = true; }
  if (f.isRecurring) { out.isRecurring = true; }
  if (f.isTemplate) { out.isTemplate = true; }
  if (f.isUncategorized) { out.isUncategorized = true; }
  return out;
}

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

// Grouped entity rendering — the SectionList stitches all entity types
// (transactions / wallets / categories / budgets / suggestions / recent)
// together so pagination and keyboard handling are uniform across them.
type SectionItem =
  | {kind: 'transaction'; id: string; transaction: Transaction}
  | {kind: 'wallet'; id: string; wallet: Wallet}
  | {kind: 'category'; id: string; category: Category}
  | {kind: 'budget'; id: string; budget: Budget}
  | {kind: 'suggestion'; id: string; suggestion: SearchSuggestion}
  | {kind: 'recent'; id: string; label: string}
  | {kind: 'saved'; id: string; preset: SavedFilter};

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
  const filterRef = useRef<BottomSheet>(null);
  const inputRef = useRef<TextInput>(null);

  const {categories} = useCategories();
  const {wallets} = useWallets();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const {allKnownTags} = useTagSuggestions();
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

  // Legacy filter state mirrors the hook's override filters but in the
  // `dateRange` / TransactionFilter shape that FilterSheet expects.
  const [legacyFilters, setLegacyFilters] = useState<LegacyFilters>({});

  useEffect(() => {
    search.setFilters(legacyToUniversal(legacyFilters));
    // We purposely only sync when `legacyFilters` changes — hook handles
    // its own debouncing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyFilters]);

  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
  const [savedFiltersList, setSavedFiltersList] = useState<SavedFilter[]>([]);
  const [showSort, setShowSort] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [saveNameDraft, setSaveNameDraft] = useState('');
  const [renameTarget, setRenameTarget] = useState<SavedFilter | null>(null);
  const searchBarFocus = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadSavedData();
      if (!cancelled) {
        setRecentSearches(getRecentSearches());
        setSavedFiltersList(getSavedFilters());
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
    // Replace only the last token — keeps previous tokens intact so
    // `cat tag:w...` -> `category: tag:work`.
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

  const openFilters = useCallback(() => {
    Keyboard.dismiss();
    filterRef.current?.expand();
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (legacyFilters.type) { count++; }
    if (legacyFilters.source) { count++; }
    if (legacyFilters.categoryId) { count++; }
    if (legacyFilters.walletId) { count++; }
    if (legacyFilters.currency) { count++; }
    if (legacyFilters.merchant) { count++; }
    if (legacyFilters.minAmount !== undefined) { count++; }
    if (legacyFilters.maxAmount !== undefined) { count++; }
    if (legacyFilters.dateRange) { count++; }
    if (legacyFilters.tags && legacyFilters.tags.length > 0) { count++; }
    if (legacyFilters.hasReceipt) { count++; }
    if (legacyFilters.hasNotes) { count++; }
    if (legacyFilters.hasLocation) { count++; }
    if (legacyFilters.hasTags) { count++; }
    if (legacyFilters.isRecurring) { count++; }
    if (legacyFilters.isTemplate) { count++; }
    if (legacyFilters.isUncategorized) { count++; }
    return count;
  }, [legacyFilters]);

  const handleSaveFilters = useCallback(() => {
    const payload: TransactionFilter = {
      type: legacyFilters.type,
      source: legacyFilters.source,
      categoryId: legacyFilters.categoryId,
      walletId: legacyFilters.walletId,
      currency: legacyFilters.currency,
      merchant: legacyFilters.merchant,
      minAmount: legacyFilters.minAmount,
      maxAmount: legacyFilters.maxAmount,
      dateRange: legacyFilters.dateRange,
      tags: legacyFilters.tags,
      hasReceipt: legacyFilters.hasReceipt,
      hasNotes: legacyFilters.hasNotes,
      hasLocation: legacyFilters.hasLocation,
      hasTags: legacyFilters.hasTags,
      isRecurring: legacyFilters.isRecurring,
      isTemplate: legacyFilters.isTemplate,
      isUncategorized: legacyFilters.isUncategorized,
    };
    const rawQuery = search.raw.trim();
    const suggested = suggestSavedFilterName(payload, rawQuery);
    setSaveNameDraft(suggested);
    setShowNamePrompt(true);
  }, [legacyFilters, search.raw]);

  const confirmSaveFilter = useCallback(() => {
    const payload: TransactionFilter = {
      type: legacyFilters.type,
      source: legacyFilters.source,
      categoryId: legacyFilters.categoryId,
      walletId: legacyFilters.walletId,
      currency: legacyFilters.currency,
      merchant: legacyFilters.merchant,
      minAmount: legacyFilters.minAmount,
      maxAmount: legacyFilters.maxAmount,
      dateRange: legacyFilters.dateRange,
      tags: legacyFilters.tags,
      hasReceipt: legacyFilters.hasReceipt,
      hasNotes: legacyFilters.hasNotes,
      hasLocation: legacyFilters.hasLocation,
      hasTags: legacyFilters.hasTags,
      isRecurring: legacyFilters.isRecurring,
      isTemplate: legacyFilters.isTemplate,
      isUncategorized: legacyFilters.isUncategorized,
    };
    try {
      addSavedFilter(saveNameDraft, payload, search.raw.trim());
      setSavedFiltersList(getSavedFilters());
      setSaveNameDraft('');
      setShowNamePrompt(false);
      emitSearchEvent('search_filter_applied', {saved: true});
    } catch {
      Alert.alert('Could not save', 'Please enter a valid name.');
    }
  }, [legacyFilters, saveNameDraft, search.raw]);

  const handleApplySavedFilter = useCallback((preset: SavedFilter) => {
    setLegacyFilters({
      type: preset.filter.type,
      source: preset.filter.source,
      categoryId: preset.filter.categoryId,
      walletId: preset.filter.walletId,
      currency: preset.filter.currency,
      merchant: preset.filter.merchant,
      minAmount: preset.filter.minAmount,
      maxAmount: preset.filter.maxAmount,
      dateRange: preset.filter.dateRange,
      tags: preset.filter.tags,
      hasReceipt: preset.filter.hasReceipt,
      hasNotes: preset.filter.hasNotes,
      hasLocation: preset.filter.hasLocation,
      hasTags: preset.filter.hasTags,
      isRecurring: preset.filter.isRecurring,
      isTemplate: preset.filter.isTemplate,
      isUncategorized: preset.filter.isUncategorized,
    });
    if (preset.rawQuery) {
      search.setRaw(preset.rawQuery);
    }
  }, [search]);

  const handleRemoveSavedFilter = useCallback((id: string) => {
    Alert.alert('Remove saved filter?', 'This removes the preset from your saved filters.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeSavedFilter(id);
          setSavedFiltersList(getSavedFilters());
        },
      },
    ]);
  }, []);

  const handleRenameSavedFilter = useCallback((preset: SavedFilter) => {
    setRenameTarget(preset);
    setSaveNameDraft(preset.name);
    setShowNamePrompt(true);
  }, []);

  const confirmRenameFilter = useCallback(() => {
    if (!renameTarget) { return; }
    try {
      renameSavedFilter(renameTarget.id, saveNameDraft);
      setSavedFiltersList(getSavedFilters());
      setRenameTarget(null);
      setSaveNameDraft('');
      setShowNamePrompt(false);
    } catch {
      Alert.alert('Could not rename', 'Please enter a valid name.');
    }
  }, [renameTarget, saveNameDraft]);

  const handleToggleSavedFilterPin = useCallback((id: string) => {
    toggleSavedFilterPin(id);
    setSavedFiltersList(getSavedFilters());
  }, []);

  const handleApplyFilters = useCallback((f: LegacyFilters) => {
    setLegacyFilters(f);
  }, []);

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

  // Active filter chips + parsed operator chips (operator chips are
  // read-only — they were typed as part of the query).
  const activeChips = useMemo(() => {
    const chips: {key: string; label: string; onClear?: () => void}[] = [];
    if (legacyFilters.type) {
      chips.push({
        key: 'type',
        label: legacyFilters.type,
        onClear: () => setLegacyFilters({...legacyFilters, type: undefined}),
      });
    }
    if (legacyFilters.categoryId) {
      const c = categories.find((x) => x.id === legacyFilters.categoryId);
      chips.push({
        key: 'category',
        label: c?.name ?? 'Category',
        onClear: () => setLegacyFilters({...legacyFilters, categoryId: undefined}),
      });
    }
    if (legacyFilters.walletId) {
      const w = wallets.find((x) => x.id === legacyFilters.walletId);
      chips.push({
        key: 'wallet',
        label: w?.name ?? 'Wallet',
        onClear: () => setLegacyFilters({...legacyFilters, walletId: undefined}),
      });
    }
    if (legacyFilters.merchant) {
      chips.push({
        key: 'merchant',
        label: legacyFilters.merchant,
        onClear: () => setLegacyFilters({...legacyFilters, merchant: undefined}),
      });
    }
    if (legacyFilters.currency) {
      chips.push({
        key: 'currency',
        label: legacyFilters.currency,
        onClear: () => setLegacyFilters({...legacyFilters, currency: undefined}),
      });
    }
    if (legacyFilters.dateRange) {
      chips.push({
        key: 'date',
        label: 'Date range',
        onClear: () => setLegacyFilters({...legacyFilters, dateRange: undefined}),
      });
    }
    if (legacyFilters.minAmount !== undefined || legacyFilters.maxAmount !== undefined) {
      const min = legacyFilters.minAmount !== undefined
        ? `>=${(legacyFilters.minAmount / 100).toFixed(0)}`
        : '';
      const max = legacyFilters.maxAmount !== undefined
        ? `<=${(legacyFilters.maxAmount / 100).toFixed(0)}`
        : '';
      chips.push({
        key: 'amount',
        label: `${min} ${max}`.trim(),
        onClear: () => setLegacyFilters({
          ...legacyFilters,
          minAmount: undefined,
          maxAmount: undefined,
        }),
      });
    }
    if (legacyFilters.tags && legacyFilters.tags.length > 0) {
      chips.push({
        key: 'tags',
        label: `#${legacyFilters.tags.join(' #')}`,
        onClear: () => setLegacyFilters({...legacyFilters, tags: undefined}),
      });
    }
    const booleanChips: Array<{key: keyof LegacyFilters; label: string}> = [
      {key: 'hasReceipt', label: 'Has receipt'},
      {key: 'hasNotes', label: 'Has notes'},
      {key: 'hasLocation', label: 'Has location'},
      {key: 'hasTags', label: 'Has tags'},
      {key: 'isRecurring', label: 'Recurring'},
      {key: 'isTemplate', label: 'Template'},
      {key: 'isUncategorized', label: 'Uncategorized'},
    ];
    for (const chip of booleanChips) {
      if (legacyFilters[chip.key]) {
        chips.push({
          key: String(chip.key),
          label: chip.label,
          onClear: () => setLegacyFilters({...legacyFilters, [chip.key]: undefined}),
        });
      }
    }
    return chips;
  }, [legacyFilters, categories, wallets]);

  const highlightNeedles = useMemo(
    () => [search.parsed.text, ...search.parsed.phrases].filter(Boolean),
    [search.parsed],
  );

  const sections: Section[] = useMemo(() => {
    const out: Section[] = [];

    if (!search.hasActiveSearch) {
      // Idle state — show suggestions-equivalent: smart lists + recents +
      // saved filters. Smart lists render as a header section; we don't
      // nest them in SectionList to keep FlatList-style horizontal scroll.
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
      if (savedFiltersList.length > 0) {
        out.push({
          title: 'Saved filters',
          kind: 'saved',
          count: savedFiltersList.length,
          data: savedFiltersList.map((p) => ({kind: 'saved', id: p.id, preset: p})),
        });
      }
      return out;
    }

    // Active search — suggestions above results.
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
  }, [search.hasActiveSearch, search.raw, search.status, search.results, recentSearches, savedFiltersList, suggestions, handleClearRecent]);

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
            onPress={() => setLegacyFilters((f) => ({...f, categoryId: item.category.id}))}
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
      case 'saved':
        return (
          <View
            style={[
              styles.savedFilterCard,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceElevated,
                marginHorizontal: spacing.base,
                marginBottom: spacing.sm,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleApplySavedFilter(item.preset)}
              onLongPress={() => handleRenameSavedFilter(item.preset)}
              style={({pressed}) => [
                styles.savedFilterMain,
                {opacity: pressed ? 0.75 : 1},
              ]}>
              <Text style={[styles.savedFilterName, {color: colors.text}]} numberOfLines={1}>
                {item.preset.pinned ? 'Pinned · ' : ''}{item.preset.name}
              </Text>
              {item.preset.rawQuery ? (
                <Text style={[styles.savedFilterHint, {color: colors.textTertiary}]} numberOfLines={1}>
                  {item.preset.rawQuery}
                </Text>
              ) : (
                <Text style={[styles.savedFilterHint, {color: colors.textTertiary}]} numberOfLines={1}>
                  Tap to apply, long-press to rename
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.preset.pinned ? 'Unpin' : 'Pin'} saved filter ${item.preset.name}`}
              onPress={() => handleToggleSavedFilterPin(item.preset.id)}
              hitSlop={12}
              style={styles.savedFilterRemove}>
              <Text style={[styles.savedFilterRemoveLabel, {color: item.preset.pinned ? colors.primary : colors.textTertiary}]}>
                {item.preset.pinned ? 'On' : 'Pin'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove saved filter ${item.preset.name}`}
              onPress={() => handleRemoveSavedFilter(item.preset.id)}
              hitSlop={12}
              style={styles.savedFilterRemove}>
              <Text style={[styles.savedFilterRemoveLabel, {color: colors.textTertiary}]}>×</Text>
            </Pressable>
          </View>
        );
    }
  }, [
    colors, spacing, radius, highlightNeedles, hideAmounts, isSelecting, selectedIds,
    openEdit, openTransactionDetail, openWalletDetail, handleApplySavedFilter,
    handleRemoveSavedFilter, handleRenameSavedFilter, handleToggleSavedFilterPin,
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
            message={`Nothing matches "${search.raw.trim() || 'your filters'}". Try adjusting your search.`}
            actionLabel="Clear all"
            onAction={search.clearAll}
          />
        </View>
      );
    }
    if (!search.hasActiveSearch && recentSearches.length === 0 && savedFiltersList.length === 0) {
      return (
        <View style={styles.hintContainer}>
          <EmptyState
            title="Search everything"
            message="Find transactions, wallets, categories, and budgets. Use operators like category:food amount:>50 or date:last-month to narrow down."
          />
        </View>
      );
    }
    return null;
  }, [search.status, search.raw, search.hasActiveSearch, search.clearAll, recentSearches.length, savedFiltersList.length]);

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
          onPress={openFilters}
          style={[
            styles.toolBtn,
            {
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
              borderRadius: radius.sm,
              backgroundColor: activeFilterCount > 0 ? colors.primaryLight + '22' : colors.surfaceElevated,
            },
          ]}>
          <Text style={{color: activeFilterCount > 0 ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: fontWeight.semibold}}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>

        {(activeFilterCount > 0 || search.raw.trim().length > 0) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save current search"
            onPress={handleSaveFilters}
            style={[
              styles.toolBtn,
              {
                borderColor: colors.primary,
                borderRadius: radius.sm,
                backgroundColor: colors.primaryLight + '22',
              },
            ]}>
            <Text style={{color: colors.primary, fontSize: 13, fontWeight: fontWeight.semibold}}>
              Save
            </Text>
          </Pressable>
        )}

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

      {activeChips.length > 0 && (
        <View
          style={[
            styles.chipBar,
            {paddingHorizontal: spacing.base, backgroundColor: colors.surface, borderBottomColor: colors.border},
          ]}>
          {activeChips.map((chip) => (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              onPress={chip.onClear}
              style={[
                styles.activeChip,
                {backgroundColor: colors.primaryLight + '22', borderRadius: radius.full, borderColor: colors.primary + '44'},
              ]}>
              <Text style={[styles.activeChipLabel, {color: colors.primary}]}>{chip.label}</Text>
              <Text style={[styles.activeChipX, {color: colors.primary}]}>×</Text>
            </Pressable>
          ))}
          {activeFilterCount > 1 && (
            <Pressable accessibilityRole="button" onPress={() => setLegacyFilters({})}>
              <Text style={[styles.clearAllLabel, {color: colors.danger}]}>Clear all</Text>
            </Pressable>
          )}
        </View>
      )}

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

      <Modal
        visible={showNamePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowNamePrompt(false);
          setRenameTarget(null);
          setSaveNameDraft('');
        }}>
        <View style={styles.promptBackdrop}>
          <View style={[
            styles.promptCard,
            {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg},
          ]}>
            <Text style={[styles.promptTitle, {color: colors.text}]}>
              {renameTarget ? 'Rename saved filter' : 'Save current search'}
            </Text>
            <TextInput
              value={saveNameDraft}
              onChangeText={setSaveNameDraft}
              style={[
                styles.promptInput,
                {color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated, borderRadius: radius.md},
              ]}
              placeholder="Filter name"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.promptActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setShowNamePrompt(false);
                  setRenameTarget(null);
                  setSaveNameDraft('');
                }}
                style={styles.promptButton}>
                <Text style={[styles.promptButtonText, {color: colors.textSecondary}]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={renameTarget ? confirmRenameFilter : confirmSaveFilter}
                style={[styles.promptButton, {backgroundColor: colors.primary, borderRadius: radius.md}]}>
                <Text style={[styles.promptButtonText, {color: '#FFFFFF'}]}>
                  {renameTarget ? 'Rename' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <TransactionBulkActionsHost
        visibleIds={search.results.transactions.map((result) => result.transaction.id)}
        categories={categories}
        onComplete={search.refresh}
        bottomOffset={insets.bottom + 16}
      />

      <FilterSheet
        ref={filterRef}
        filters={legacyFilters}
        onApply={handleApplyFilters}
        categories={categories}
        wallets={wallets}
        knownTags={allKnownTags}
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
  activeChipLabel: {fontSize: 12, fontWeight: '600'},
  activeChipX: {fontSize: 12, fontWeight: '700'},
  clearAllLabel: {fontSize: 12, fontWeight: '600', marginLeft: 4},
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
  savedFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  savedFilterMain: {flex: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 2},
  savedFilterName: {fontSize: 15, fontWeight: '600'},
  savedFilterHint: {fontSize: 11, fontWeight: '500'},
  savedFilterRemove: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  savedFilterRemoveLabel: {fontSize: 18, fontWeight: '700'},
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
  promptBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 24,
  },
  promptCard: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  promptTitle: {fontSize: 17, fontWeight: '700'},
  promptInput: {
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  promptButton: {
    minHeight: 44,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  promptButtonText: {fontSize: 14, fontWeight: '700'},
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
