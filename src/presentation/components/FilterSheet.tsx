import React, {forwardRef, useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import type {BottomSheetDefaultBackdropProps} from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Chip} from './common/Chip';
import type {SearchFilters} from '@presentation/hooks/useSearch';
import type {Category} from '@domain/entities/Category';
import type {Wallet} from '@domain/entities/Wallet';
import type {TransactionType, TransactionSource} from '@domain/entities/Transaction';
import {resolveIconName} from './common/AppIcon';

type Props = {
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  categories: Category[];
  wallets: Wallet[];
};

const TYPE_OPTIONS: {value: TransactionType; label: string}[] = [
  {value: 'expense', label: 'Expenses'},
  {value: 'income', label: 'Income'},
  {value: 'transfer', label: 'Transfers'},
];

const SOURCE_OPTIONS: {value: TransactionSource; label: string}[] = [
  {value: 'manual', label: 'Manual'},
  {value: 'payoneer', label: 'Payoneer'},
  {value: 'grey', label: 'Grey'},
  {value: 'dukascopy', label: 'Dukascopy'},
];

const COMMON_TAGS = [
  'food', 'team', 'travel', 'bills', 'payroll', 'office', 'home', 'subs', 'client-a',
];

const DATE_PRESETS: {label: string; daysBack: number}[] = [
  {label: 'Today', daysBack: 0},
  {label: 'Last 7 days', daysBack: 7},
  {label: 'Last 30 days', daysBack: 30},
  {label: 'Last 90 days', daysBack: 90},
  {label: 'This year', daysBack: -1},
];

function getDateRangeForPreset(daysBack: number): {startMs: number; endMs: number} | undefined {
  const now = Date.now();
  if (daysBack === 0) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return {startMs: start.getTime(), endMs: now};
  }
  if (daysBack === -1) {
    const start = new Date(new Date().getFullYear(), 0, 1).getTime();
    return {startMs: start, endMs: now};
  }
  const MS_PER_DAY = 86400000;
  return {startMs: now - daysBack * MS_PER_DAY, endMs: now};
}

function getPresetLabel(dateRange?: {startMs: number; endMs: number}): string | null {
  if (!dateRange) {
    return null;
  }
  const now = Date.now();
  const MS_PER_DAY = 86400000;
  const diff = now - dateRange.startMs;
  if (diff < MS_PER_DAY * 1.5) {
    return 'Today';
  }
  if (Math.abs(diff - 7 * MS_PER_DAY) < MS_PER_DAY) {
    return 'Last 7 days';
  }
  if (Math.abs(diff - 30 * MS_PER_DAY) < MS_PER_DAY * 2) {
    return 'Last 30 days';
  }
  if (Math.abs(diff - 90 * MS_PER_DAY) < MS_PER_DAY * 2) {
    return 'Last 90 days';
  }
  return null;
}

export const FilterSheet = forwardRef<BottomSheet, Props>(
  function FilterSheet({filters, onApply, categories, wallets}, ref) {
    const {colors, spacing, radius, typography} = useTheme();
    const snapPoints = useMemo(() => ['85%'], []);

    const [draft, setDraft] = useState<SearchFilters>({...filters});
    const [minAmountText, setMinAmountText] = useState(
      filters.minAmount !== undefined ? String(filters.minAmount / 100) : '',
    );
    const [maxAmountText, setMaxAmountText] = useState(
      filters.maxAmount !== undefined ? String(filters.maxAmount / 100) : '',
    );

    const handleOpen = useCallback(() => {
      setDraft({...filters});
      setMinAmountText(
        filters.minAmount !== undefined ? String(filters.minAmount / 100) : '',
      );
      setMaxAmountText(
        filters.maxAmount !== undefined ? String(filters.maxAmount / 100) : '',
      );
    }, [filters]);

    const handleApply = useCallback(() => {
      const final: SearchFilters = {...draft};
      const minVal = parseFloat(minAmountText);
      const maxVal = parseFloat(maxAmountText);
      final.minAmount = !isNaN(minVal) && minVal > 0 ? Math.round(minVal * 100) : undefined;
      final.maxAmount = !isNaN(maxVal) && maxVal > 0 ? Math.round(maxVal * 100) : undefined;
      onApply(final);
      (ref as React.RefObject<BottomSheet>)?.current?.close();
    }, [draft, minAmountText, maxAmountText, onApply, ref]);

    const handleReset = useCallback(() => {
      setDraft({});
      setMinAmountText('');
      setMaxAmountText('');
    }, []);

    const toggleType = useCallback((t: TransactionType) => {
      setDraft((prev) => ({
        ...prev,
        type: prev.type === t ? undefined : t,
      }));
    }, []);

    const toggleSource = useCallback((s: TransactionSource) => {
      setDraft((prev) => ({
        ...prev,
        source: prev.source === s ? undefined : s,
      }));
    }, []);

    const toggleCategory = useCallback((id: string) => {
      setDraft((prev) => ({
        ...prev,
        categoryId: prev.categoryId === id ? undefined : id,
      }));
    }, []);

    const toggleWallet = useCallback((id: string) => {
      setDraft((prev) => ({
        ...prev,
        walletId: prev.walletId === id ? undefined : id,
      }));
    }, []);

    const selectDatePreset = useCallback((daysBack: number) => {
      setDraft((prev) => {
        const existing = getPresetLabel(prev.dateRange);
        const targetLabel = DATE_PRESETS.find((p) => p.daysBack === daysBack)?.label;
        if (existing === targetLabel) {
          return {...prev, dateRange: undefined};
        }
        return {...prev, dateRange: getDateRangeForPreset(daysBack)};
      });
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetDefaultBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      [],
    );

    const activeCount = useMemo(() => {
      let count = 0;
      if (draft.type) {count++;}
      if (draft.source) {count++;}
      if (draft.categoryId) {count++;}
      if (draft.walletId) {count++;}
      if (draft.dateRange) {count++;}
      if (draft.tags && draft.tags.length > 0) {count++;}
      if (minAmountText) {count++;}
      if (maxAmountText) {count++;}
      return count;
    }, [draft, minAmountText, maxAmountText]);

    const selectedPreset = getPresetLabel(draft.dateRange);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: colors.surface}}
        handleIndicatorStyle={{backgroundColor: colors.border}}
        onChange={(idx) => { if (idx >= 0) { handleOpen(); } }}
      >
        <BottomSheetView style={styles.container}>
          <View style={[styles.sheetHeader, {paddingHorizontal: spacing.base}]}>
            <Text style={[typography.title3, {color: colors.text}]}>Filters</Text>
            {activeCount > 0 && (
              <Pressable onPress={handleReset} accessibilityRole="button">
                <Text style={[styles.resetBtn, {color: colors.danger}]}>Reset all</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, {paddingHorizontal: spacing.base}]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
                TRANSACTION TYPE
              </Text>
              <View style={styles.chipRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={draft.type === opt.value}
                    onPress={() => toggleType(opt.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>SOURCE</Text>
              <View style={styles.chipRow}>
                {SOURCE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={draft.source === opt.value}
                    onPress={() => toggleSource(opt.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>DATE RANGE</Text>
              <View style={styles.chipRow}>
                {DATE_PRESETS.map((preset) => (
                  <Chip
                    key={preset.label}
                    label={preset.label}
                    selected={selectedPreset === preset.label}
                    onPress={() => selectDatePreset(preset.daysBack)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
                AMOUNT RANGE
              </Text>
              <View style={styles.amountRow}>
                <View style={[
                  styles.amountInputWrap,
                  {borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceElevated},
                ]}>
                  <Text style={[styles.amountPrefix, {color: colors.textTertiary}]}>Min</Text>
                  <TextInput
                    style={[styles.amountInput, {color: colors.text}]}
                    value={minAmountText}
                    onChangeText={setMinAmountText}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <Text style={[styles.amountDash, {color: colors.textTertiary}]}>to</Text>
                <View style={[
                  styles.amountInputWrap,
                  {borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceElevated},
                ]}>
                  <Text style={[styles.amountPrefix, {color: colors.textTertiary}]}>Max</Text>
                  <TextInput
                    style={[styles.amountInput, {color: colors.text}]}
                    value={maxAmountText}
                    onChangeText={setMaxAmountText}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
            </View>

            {categories.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>CATEGORY</Text>
                <View style={styles.chipRow}>
                  {categories.slice(0, 15).map((cat) => (
                    <Chip
                      key={cat.id}
                      label={cat.name}
                      selected={draft.categoryId === cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      color={cat.color}
                    />
                  ))}
                </View>
              </View>
            )}

            {wallets.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>WALLET</Text>
                <View style={styles.chipRow}>
                  {wallets.map((w) => (
                    <Chip
                      key={w.id}
                      label={w.name}
                      selected={draft.walletId === w.id}
                      onPress={() => toggleWallet(w.id)}
                      color={w.color}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>TAGS</Text>
              <View style={styles.chipRow}>
                {COMMON_TAGS.map((tag) => {
                  const isSelected = draft.tags?.includes(tag) ?? false;
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      selected={isSelected}
                      onPress={() => {
                        setDraft((prev) => {
                          const current = prev.tags ?? [];
                          if (current.includes(tag)) {
                            return {...prev, tags: current.filter((t) => t !== tag)};
                          }
                          return {...prev, tags: [...current, tag]};
                        });
                      }}
                    />
                  );
                })}
              </View>
            </View>

            <View style={{height: 80}} />
          </ScrollView>

          <View style={[
            styles.applyBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingHorizontal: spacing.base,
              paddingBottom: spacing.lg,
            },
          ]}>
            <Pressable
              accessibilityRole="button"
              onPress={handleApply}
              style={({pressed}) => [
                styles.applyButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text style={[styles.applyText, {color: '#FFFFFF'}]}>
                Apply filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  resetBtn: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  scrollContent: {
    paddingTop: 4,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    gap: 6,
  },
  amountPrefix: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    height: 44,
  },
  amountDash: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
  },
  applyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  applyButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
});
