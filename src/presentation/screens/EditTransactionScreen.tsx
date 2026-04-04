import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {Button, Card, Input, AmountInput, Chip} from '@presentation/components/common';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {CategoryPicker} from '@presentation/components/common/CategoryPicker';
import {ScreenContainer} from '@presentation/components/layout';
import {TagInput} from '@presentation/components/TagInput';
import {NotesEditor} from '@presentation/components/NotesEditor';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';
import type {TransactionsStackParamList} from '@presentation/navigation/types';
import type {RouteProp} from '@react-navigation/native';
import type {CreateTransactionInput} from '@domain/entities/Transaction';
import {getMockTransactionById} from './TransactionsScreen';
import {buildCreateTransactionInputFromForm} from './AddTransactionScreen';

type Nav = NativeStackNavigationProp<TransactionsStackParamList, 'EditTransaction'>;
type Route = RouteProp<TransactionsStackParamList, 'EditTransaction'>;

function categoryIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'category';
}

function resolveCategory(categoryId: string): {name: string; color: string} | null {
  if (!categoryId) {
    return null;
  }
  const found = DEFAULT_CATEGORIES.find((c) => categoryIdFromName(c.name) === categoryId);
  return found ? {name: found.name, color: found.color} : null;
}

function formatDisplayDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ts));
}

function mergeUpdateInput(base: CreateTransactionInput, existingId: string, walletId: string, createdAt: number): CreateTransactionInput {
  return {
    ...base,
    id: existingId,
    walletId,
    createdAt,
    updatedAt: Date.now(),
  };
}

export default function EditTransactionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {colors, spacing, typography} = useTheme();
  const insets = useSafeAreaInsets();

  const existing = useMemo(
    () => getMockTransactionById(route.params.transactionId),
    [route.params.transactionId],
  );

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [transactionDate, setTransactionDate] = useState(Date.now());

  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryError, setCategoryError] = useState<string | undefined>(undefined);

  const knownTags = useMemo(
    () => ['food', 'team', 'travel', 'bills', 'payroll', 'office', 'home', 'subs', 'client-a'],
    [],
  );

  useEffect(() => {
    if (!existing) {
      return;
    }
    setType(existing.type);
    setAmount(existing.amount);
    setCurrency(existing.currency);
    setCategoryId(existing.categoryId);
    setDescription(existing.description);
    setMerchant(existing.merchant);
    setNotes(existing.notes);
    setTags([...existing.tags]);
    setTransactionDate(existing.transactionDate);
  }, [existing]);

  const categoryMeta = useMemo(() => resolveCategory(categoryId), [categoryId]);
  const categoryPickerFilter = type === 'transfer' ? undefined : type;

  const handleSave = useCallback(() => {
    if (!existing) {
      return;
    }
    if (amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    if (!categoryId.trim()) {
      setCategoryError('Choose a category');
      Alert.alert('Category required', 'Select a category before saving.');
      return;
    }
    setCategoryError(undefined);

    const draft = buildCreateTransactionInputFromForm({
      type,
      amount,
      currency,
      categoryId,
      description,
      merchant,
      notes,
      tags,
      transactionDate,
    });
    const payload = mergeUpdateInput(draft, existing.id, existing.walletId, existing.createdAt);
    console.log('UpdateTransactionInput (mock)', payload);
    navigation.goBack();
  }, [
    amount,
    categoryId,
    currency,
    description,
    existing,
    merchant,
    navigation,
    notes,
    tags,
    transactionDate,
    type,
  ]);


  if (!existing) {
    return (
      <ScreenContainer>
        <View style={{flex: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl}}>
          <Text style={[typography.title3, {color: colors.text}]}>Transaction not found</Text>
          <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.sm}]}>
            This id is not in the mock data set yet.
          </Text>
          <View style={{marginTop: spacing.lg}}>
            <Button onPress={() => navigation.goBack()} title="Go back" />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: spacing.base,
              paddingBottom: insets.bottom + spacing['2xl'],
              gap: spacing.base,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.headerRow, {paddingTop: spacing.sm}]}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => navigation.goBack()}
              style={styles.headerBtn}>
              <Text style={[typography.callout, {color: colors.primary, fontWeight: '600'}]}>Back</Text>
            </Pressable>
            <Text style={[typography.title3, {color: colors.text}]}>Edit Transaction</Text>
            <View style={styles.headerBtn} />
          </View>

          <View style={styles.typeRow}>
            <Chip
              color={colors.danger}
              label="Expense"
              onPress={() => setType('expense')}
              selected={type === 'expense'}
            />
            <Chip
              color={colors.success}
              label="Income"
              onPress={() => setType('income')}
              selected={type === 'income'}
            />
            <Chip
              color={colors.primary}
              label="Transfer"
              onPress={() => setType('transfer')}
              selected={type === 'transfer'}
            />
          </View>

          <View style={styles.amountBlock}>
            <AmountInput
              currency={currency}
              onChangeValue={setAmount}
              onCurrencyPress={() => setCurrencyPickerOpen(true)}
              value={amount}
            />
          </View>

          <Card onPress={() => setCategoryPickerOpen(true)} padding="md">
            <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>Category</Text>
            {categoryMeta ? (
              <View style={styles.categoryRow}>
                <View style={[styles.categoryDot, {backgroundColor: categoryMeta.color}]} />
                <Text style={[typography.body, {color: colors.text, fontWeight: '600'}]}>
                  {categoryMeta.name}
                </Text>
              </View>
            ) : (
              <Text style={[typography.body, {color: colors.textTertiary}]}>Select Category</Text>
            )}
            {categoryError ? (
              <Text style={[styles.inlineError, {color: colors.danger}]}>{categoryError}</Text>
            ) : null}
          </Card>

          <Input label="Description" onChangeText={setDescription} placeholder="What was this for?" value={description} />

          <Input
            helperText="Optional"
            label="Merchant"
            onChangeText={setMerchant}
            placeholder="Store or counterparty"
            value={merchant}
          />

          <Card padding="md">
            <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>Date</Text>
            <Text style={[typography.body, {color: colors.text, fontWeight: '500', marginTop: 4}]}>
              {formatDisplayDate(transactionDate)}
            </Text>
            <Text style={[typography.caption, {color: colors.textTertiary, marginTop: 6}]}>
              Date picker arrives in a later release. Showing stored transaction date.
            </Text>
          </Card>

          <NotesEditor
            value={notes}
            onChangeText={setNotes}
          />

          <TagInput
            tags={tags}
            allKnownTags={knownTags}
            onTagsChange={setTags}
          />

          <Button fullWidth onPress={handleSave} size="lg" title="Update Transaction" />
        </ScrollView>
      </ScreenContainer>

      <CurrencyPicker
        onClose={() => setCurrencyPickerOpen(false)}
        onSelect={setCurrency}
        selectedCode={currency}
        visible={currencyPickerOpen}
      />

      <CategoryPicker
        onClose={() => setCategoryPickerOpen(false)}
        onSelect={(id) => {
          setCategoryId(id);
          setCategoryError(undefined);
        }}
        selectedId={categoryId || undefined}
        type={categoryPickerFilter}
        visible={categoryPickerOpen}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerBtn: {
    minWidth: 72,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amountBlock: {
    alignItems: 'stretch',
    justifyContent: 'center',
    minHeight: 72,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  categoryDot: {
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  inlineError: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
});
