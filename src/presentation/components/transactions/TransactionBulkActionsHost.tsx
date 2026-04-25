import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import type {Category} from '@domain/entities/Category';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Chip} from '@presentation/components/common';
import {BulkActionBar} from '@presentation/components/transactions/BulkActionBar';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import {useTransactionSelectionStore} from '@presentation/stores/useTransactionSelectionStore';
import {useTagSuggestions} from '@presentation/hooks/useTagSuggestions';

type TransactionBulkActionsHostProps = {
  visibleIds: string[];
  categories: Category[];
  onComplete: () => void;
  bottomOffset?: number;
};

type ActiveSheet = 'category' | 'tags' | null;

export function TransactionBulkActionsHost({
  visibleIds,
  categories,
  onComplete,
  bottomOffset = 16,
}: TransactionBulkActionsHostProps) {
  const {colors, spacing, radius} = useTheme();
  const selectedIds = useTransactionSelectionStore((s) => s.selectedIds);
  const selectedCount = useTransactionSelectionStore((s) => s.selectedCount);
  const selectVisible = useTransactionSelectionStore((s) => s.selectVisible);
  const clearSelection = useTransactionSelectionStore((s) => s.clearSelection);
  const {bulkUpdateCategory, bulkUpdateTags, deleteTransactions, isSubmitting} = useTransactionActions();
  const {allKnownTags} = useTagSuggestions();
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [tagText, setTagText] = useState('');

  const finish = useCallback((message: string) => {
    clearSelection();
    setActiveSheet(null);
    setTagText('');
    onComplete();
    Alert.alert('Bulk update complete', message);
  }, [clearSelection, onComplete]);

  const applyCategory = useCallback(async (categoryId: string) => {
    const result = await bulkUpdateCategory(selectedIds, categoryId);
    finish(`${result.updatedIds.length} transaction${result.updatedIds.length === 1 ? '' : 's'} updated.`);
  }, [bulkUpdateCategory, finish, selectedIds]);

  const applyTags = useCallback(async (mode: 'add' | 'remove' | 'replace') => {
    const tags = tagText.split(',').map((tag) => tag.trim()).filter(Boolean);
    const result = await bulkUpdateTags(selectedIds, mode, tags);
    finish(`${result.updatedIds.length} transaction${result.updatedIds.length === 1 ? '' : 's'} updated.`);
  }, [bulkUpdateTags, finish, selectedIds, tagText]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete selected transactions?',
      `This will permanently delete ${selectedCount} transaction${selectedCount === 1 ? '' : 's'} and update wallet balances.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await deleteTransactions(selectedIds);
              finish(`${result.updatedIds.length} transaction${result.updatedIds.length === 1 ? '' : 's'} deleted.`);
            })();
          },
        },
      ],
    );
  }, [deleteTransactions, finish, selectedCount, selectedIds]);

  return (
    <>
      <View pointerEvents="box-none" style={[styles.barHost, {bottom: bottomOffset}]}>
        <BulkActionBar
          selectedCount={selectedCount}
          onSelectVisible={() => selectVisible(visibleIds)}
          onChangeCategory={() => setActiveSheet('category')}
          onChangeTags={() => setActiveSheet('tags')}
          onDelete={confirmDelete}
          onClear={clearSelection}
        />
      </View>

      <Modal
        visible={activeSheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveSheet(null)}>
        <View style={styles.backdrop}>
          <View style={[
            styles.sheet,
            {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.base},
          ]}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : activeSheet === 'category' ? (
              <>
                <Text style={[styles.title, {color: colors.text}]}>Change category</Text>
                <View style={styles.chipRow}>
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      color={category.color}
                      onPress={() => { void applyCategory(category.id); }}
                    />
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.title, {color: colors.text}]}>Update tags</Text>
                <TextInput
                  value={tagText}
                  onChangeText={setTagText}
                  style={[
                    styles.input,
                    {color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated, borderRadius: radius.md},
                  ]}
                  placeholder="food, work trip"
                  placeholderTextColor={colors.textTertiary}
                />
                {allKnownTags.length > 0 ? (
                  <View style={styles.chipRow}>
                    {allKnownTags.slice(0, 12).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onPress={() => setTagText((current) => current ? `${current}, ${tag}` : tag)}
                      />
                    ))}
                  </View>
                ) : null}
                <View style={styles.actionRow}>
                  <ActionButton label="Add" color={colors.primary} onPress={() => { void applyTags('add'); }} />
                  <ActionButton label="Remove" color={colors.warning} onPress={() => { void applyTags('remove'); }} />
                  <ActionButton label="Replace" color={colors.danger} onPress={() => { void applyTags('replace'); }} />
                </View>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveSheet(null)}
              style={styles.cancelButton}>
              <Text style={[styles.cancelText, {color: colors.textSecondary}]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ActionButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionButton}>
      <Text style={[styles.actionText, {color}]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barHost: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 30,
    elevation: 20,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
    margin: 16,
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
});
