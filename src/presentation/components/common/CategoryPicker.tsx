import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Dimensions, Pressable, StyleSheet, Text, View} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {hasType, type Category} from '@domain/entities/Category';
import {useCategories} from '@presentation/hooks/useCategories';
import {useTheme} from '@shared/theme';
import {AppIcon, resolveIconName} from './AppIcon';

export type CategoryPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  selectedId?: string;
  type?: 'expense' | 'income' | 'both';
  testID?: string;
};

function categoryIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'category';
}

function filterByTab(cats: Category[], tab: 'expense' | 'income'): Category[] {
  return cats.filter((c) => hasType(c, tab));
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function CategoryPicker({
  visible,
  onClose,
  onSelect,
  selectedId,
  type,
  testID,
}: CategoryPickerProps) {
  const {colors, radius, spacing, typography} = useTheme();
  const {categories: dbCategories} = useCategories();
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  const lockedTab: 'expense' | 'income' | null =
    type === 'expense' ? 'expense' : type === 'income' ? 'income' : null;

  const activeTab = lockedTab ?? tab;

  useEffect(() => {
    if (type === 'expense') {
      setTab('expense');
    } else if (type === 'income') {
      setTab('income');
    }
  }, [type]);

  const categories = useMemo(
    () => filterByTab(dbCategories, activeTab),
    [activeTab, dbCategories],
  );

  const showTabs = type === undefined || type === 'both';

  const sheetIndex = visible ? 0 : -1;

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const gap = spacing.sm;
  const horizontalPad = spacing.md * 2;
  const cellWidth = (SCREEN_WIDTH - horizontalPad - gap * 2) / 3;

  return (
    <BottomSheet
      backdropComponent={renderBackdrop}
      enableDynamicSizing={false}
      enablePanDownToClose
      index={sheetIndex}
      keyboardBlurBehavior="restore"
      onChange={handleSheetChange}
      snapPoints={['50%', '80%']}>
      <BottomSheetView style={styles.sheetBody} testID={testID}>
        {showTabs ? (
          <View
            style={[
              styles.tabRow,
              {
                borderColor: colors.border,
                marginBottom: spacing.md,
                marginHorizontal: spacing.md,
              },
            ]}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{selected: activeTab === 'expense'}}
              onPress={() => setTab('expense')}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: activeTab === 'expense' ? colors.primaryLight + '40' : 'transparent',
                  borderRadius: radius.sm,
                },
              ]}
              testID={testID ? `${testID}-tab-expense` : undefined}>
              <Text
                style={[
                  typography.callout,
                  {
                    color: activeTab === 'expense' ? colors.primary : colors.textSecondary,
                    fontWeight: activeTab === 'expense' ? '600' : '500',
                    textAlign: 'center',
                  },
                ]}>
                Expense
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{selected: activeTab === 'income'}}
              onPress={() => setTab('income')}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: activeTab === 'income' ? colors.primaryLight + '40' : 'transparent',
                  borderRadius: radius.sm,
                },
              ]}
              testID={testID ? `${testID}-tab-income` : undefined}>
              <Text
                style={[
                  typography.callout,
                  {
                    color: activeTab === 'income' ? colors.primary : colors.textSecondary,
                    fontWeight: activeTab === 'income' ? '600' : '500',
                    textAlign: 'center',
                  },
                ]}>
                Income
              </Text>
            </Pressable>
          </View>
        ) : null}

        <BottomSheetScrollView
          contentContainerStyle={{paddingBottom: spacing.lg, paddingHorizontal: spacing.md}}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.grid, {columnGap: gap, rowGap: gap}]}>
            {categories.map((cat) => {
              const slugId = categoryIdFromName(cat.name);
              const selected =
                selectedId !== undefined &&
                (selectedId === cat.id || selectedId === slugId);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  key={cat.id}
                  onPress={() => {
                    onSelect(cat.id);
                    onClose();
                  }}
                  style={[styles.cell, {width: cellWidth}]}
                  testID={testID ? `${testID}-cat-${cat.id}` : undefined}>
                  <View
                    style={[
                      styles.circle,
                      {
                        backgroundColor: cat.color,
                        borderColor: selected ? colors.primary : 'transparent',
                        borderRadius: 999,
                        borderWidth: selected ? 3 : 0,
                      },
                    ]}>
                    <AppIcon name={resolveIconName(cat.icon)} size={24} color="#FFFFFF" />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[
                      typography.caption,
                      {
                        color: selected ? colors.primary : colors.textSecondary,
                        fontWeight: selected ? '600' : '500',
                        marginTop: 8,
                        textAlign: 'center',
                      },
                    ]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1,
  },
  tabRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    alignItems: 'center',
  },
  circle: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  circleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
