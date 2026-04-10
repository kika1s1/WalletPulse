import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {BackButton, Button, Card, Input, AmountInput, Chip} from '@presentation/components/common';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {CategoryPicker} from '@presentation/components/common/CategoryPicker';
import {ScreenContainer} from '@presentation/components/layout';
import {TagInput} from '@presentation/components/TagInput';
import {NotesEditor} from '@presentation/components/NotesEditor';
import type {TransactionsStackParamList} from '@presentation/navigation/types';
import type {RouteProp} from '@react-navigation/native';
import type {Category} from '@domain/entities/Category';
import {useTransactionById} from '@presentation/hooks/useTransactions';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import {useCategories} from '@presentation/hooks/useCategories';
import {useWallets} from '@presentation/hooks/useWallets';
import {WalletPicker} from '@presentation/components/common/WalletPicker';
import {buildCreateTransactionInputFromForm} from './AddTransactionScreen';
import {ReceiptAttachmentField} from '@presentation/components/ReceiptAttachmentField';

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

const RECURRENCE_OPTIONS = [
  {label: 'Daily', value: 'DAILY'},
  {label: 'Weekly', value: 'WEEKLY'},
  {label: 'Biweekly', value: 'BIWEEKLY'},
  {label: 'Monthly', value: 'MONTHLY'},
  {label: 'Quarterly', value: 'QUARTERLY'},
  {label: 'Yearly', value: 'YEARLY'},
] as const;

function resolveCategory(
  categoryId: string,
  categories: Category[],
): {name: string; color: string} | null {
  if (!categoryId) {
    return null;
  }
  const found =
    categories.find((c) => c.id === categoryId) ??
    categories.find((c) => categoryIdFromName(c.name) === categoryId);
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

export default function EditTransactionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {colors, spacing, typography} = useTheme();
  const insets = useSafeAreaInsets();

  const {transaction: existing, isLoading, error} = useTransactionById(
    route.params.transactionId,
  );
  const {updateTransaction, isSubmitting} = useTransactionActions();
  const {categories} = useCategories();
  const {wallets} = useWallets();

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [transactionDate, setTransactionDate] = useState(Date.now());
  const [receiptUri, setReceiptUri] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [walletId, setWalletId] = useState('');
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryError, setCategoryError] = useState<string | undefined>(undefined);

  const selectedWallet = useMemo(
    () => wallets.find((w) => w.id === walletId) ?? null,
    [walletId, wallets],
  );

  const handleSelectWallet = useCallback((id: string) => {
    setWalletId(id);
    const w = wallets.find((x) => x.id === id);
    if (w) {
      setCurrency(w.currency);
    }
  }, [wallets]);

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
    setReceiptUri(existing.receiptUri?.trim() ?? '');
    setIsRecurring(existing.isRecurring);
    setRecurrenceRule(existing.recurrenceRule);
    setWalletId(existing.walletId);
  }, [existing]);

  const categoryMeta = useMemo(
    () => resolveCategory(categoryId, categories),
    [categories, categoryId],
  );
  const categoryPickerFilter = type === 'transfer' ? undefined : type;

  const hasUnsavedChanges = existing
    ? type !== existing.type ||
      amount !== existing.amount ||
      currency !== existing.currency ||
      categoryId !== existing.categoryId ||
      description !== existing.description ||
      merchant !== existing.merchant ||
      notes !== existing.notes ||
      transactionDate !== existing.transactionDate ||
      receiptUri !== (existing.receiptUri?.trim() ?? '') ||
      isRecurring !== existing.isRecurring ||
      recurrenceRule !== existing.recurrenceRule ||
      walletId !== existing.walletId ||
      JSON.stringify(tags) !== JSON.stringify(existing.tags)
    : false;

  const handleReset = useCallback(() => {
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
    setReceiptUri(existing.receiptUri?.trim() ?? '');
    setIsRecurring(existing.isRecurring);
    setRecurrenceRule(existing.recurrenceRule);
    setWalletId(existing.walletId);
    setCategoryError(undefined);
  }, [existing]);

  const handleSave = useCallback(async () => {
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

    const draft = buildCreateTransactionInputFromForm(
      {
        type,
        amount,
        currency,
        categoryId,
        description,
        merchant,
        notes,
        tags,
        transactionDate,
        receiptUri,
        isRecurring,
        recurrenceRule,
      },
      walletId,
      existing.id,
    );
    try {
      await updateTransaction({
        id: existing.id,
        walletId: draft.walletId,
        categoryId: draft.categoryId,
        amount: draft.amount,
        currency: draft.currency,
        type: draft.type,
        description: draft.description,
        merchant: draft.merchant,
        notes: draft.notes,
        tags: draft.tags,
        transactionDate: draft.transactionDate,
        receiptUri: draft.receiptUri,
        isRecurring: draft.isRecurring,
        recurrenceRule: draft.recurrenceRule,
        updatedAt: Date.now(),
      });
      navigation.goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not update transaction', message);
    }
  }, [
    amount,
    categoryId,
    currency,
    description,
    existing,
    merchant,
    navigation,
    notes,
    receiptUri,
    recurrenceRule,
    tags,
    transactionDate,
    type,
    updateTransaction,
    walletId,
    isRecurring,
  ]);

  if (isLoading) {
    return (
      <ScreenContainer avoidKeyboard>
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.base,
            paddingTop: spacing.xl,
            alignItems: 'center',
          }}>
          <ActivityIndicator accessibilityLabel="Loading transaction" color={colors.primary} size="large" />
          <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.md}]}>Loading…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer avoidKeyboard>
        <View style={{flex: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl}}>
          <Text style={[typography.title3, {color: colors.text}]}>Something went wrong</Text>
          <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.sm}]}>{error}</Text>
          <View style={{marginTop: spacing.lg}}>
            <Button onPress={() => navigation.goBack()} title="Go back" />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (!existing) {
    return (
      <ScreenContainer avoidKeyboard>
        <View style={{flex: 1, paddingHorizontal: spacing.base, paddingTop: spacing.xl}}>
          <Text style={[typography.title3, {color: colors.text}]}>Transaction not found</Text>
          <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.sm}]}>
            This transaction may have been deleted or is no longer available.
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
      <ScreenContainer avoidKeyboard scrollable={false}>
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
            <BackButton />
            <Text style={[typography.title3, {color: colors.text}]}>Edit Transaction</Text>
            {hasUnsavedChanges ? (
              <Pressable
                accessibilityLabel="Reset changes"
                accessibilityRole="button"
                hitSlop={12}
                onPress={handleReset}
                style={styles.headerBtn}>
                <Text
                  style={[
                    typography.callout,
                    {color: colors.danger, fontWeight: '600', textAlign: 'right'},
                  ]}>
                  Reset
                </Text>
              </Pressable>
            ) : (
              <View style={styles.headerBtn} />
            )}
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

          <Card onPress={() => setWalletPickerOpen(true)} padding="md">
            <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>Wallet</Text>
            {selectedWallet ? (
              <View style={styles.walletRow}>
                <View style={[styles.categoryDot, {backgroundColor: selectedWallet.color}]} />
                <View style={styles.walletTextCol}>
                  <Text style={[typography.body, {color: colors.text, fontWeight: '600'}]}>
                    {selectedWallet.name}
                  </Text>
                  <Text style={[typography.caption, {color: colors.textTertiary}]}>
                    {selectedWallet.currency}
                  </Text>
                </View>
                <Text style={[typography.caption, {color: colors.primary}]}>Change</Text>
              </View>
            ) : (
              <Text style={[typography.body, {color: colors.textTertiary}]}>Select wallet</Text>
            )}
          </Card>

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

          <Card onPress={() => setShowDatePicker(true)} padding="md">
            <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>Date</Text>
            <View style={styles.dateRow}>
              <Text style={[typography.body, {color: colors.text, fontWeight: '500', flex: 1}]}>
                {formatDisplayDate(transactionDate)}
              </Text>
              <Text style={[typography.caption, {color: colors.primary}]}>Change</Text>
            </View>
          </Card>
          {showDatePicker && (
            <DateTimePicker
              maximumDate={new Date()}
              mode="date"
              onChange={(_e, selected) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                if (selected) {
                  setTransactionDate(selected.getTime());
                }
              }}
              value={new Date(transactionDate)}
            />
          )}

          {type !== 'transfer' && (
            <Card padding="md">
              <View style={styles.recurrenceHeader}>
                <View style={{flex: 1}}>
                  <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>Recurring</Text>
                  <Text style={[typography.caption, {color: colors.textTertiary}]}>
                    Repeat this transaction automatically
                  </Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={(v) => {
                    setIsRecurring(v);
                    if (!v) {setRecurrenceRule('');}
                    else if (!recurrenceRule) {setRecurrenceRule('MONTHLY');}
                  }}
                  thumbColor={isRecurring ? colors.primary : colors.border}
                  trackColor={{false: colors.borderLight, true: colors.primaryLight}}
                />
              </View>
              {isRecurring && (
                <View style={styles.recurrenceChips}>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      onPress={() => setRecurrenceRule(opt.value)}
                      selected={recurrenceRule === opt.value}
                      size="sm"
                    />
                  ))}
                </View>
              )}
            </Card>
          )}

          <NotesEditor
            value={notes}
            onChangeText={setNotes}
          />

          <TagInput
            tags={tags}
            onTagsChange={setTags}
          />

          <ReceiptAttachmentField
            onChange={setReceiptUri}
            storageKeyId={existing.id}
            value={receiptUri}
          />

          <Button
            fullWidth
            loading={isSubmitting}
            onPress={handleSave}
            size="lg"
            title="Update Transaction"
          />
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

      <WalletPicker
        excludeWalletIds={[]}
        onClose={() => setWalletPickerOpen(false)}
        onSelect={handleSelectWallet}
        selectedWalletId={walletId || undefined}
        title="Select wallet"
        visible={walletPickerOpen}
        wallets={wallets}
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
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  recurrenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recurrenceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  inlineError: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  walletRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  walletTextCol: {
    flex: 1,
    minWidth: 0,
  },
});
