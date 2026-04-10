import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {BackButton, Button, Card, Input, AmountInput, Chip} from '@presentation/components/common';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {CategoryPicker} from '@presentation/components/common/CategoryPicker';
import {ScreenContainer} from '@presentation/components/layout';
import {TagInput} from '@presentation/components/TagInput';
import {NotesEditor} from '@presentation/components/NotesEditor';
import {DEFAULT_BASE_CURRENCY} from '@shared/constants/currencies';
import {generateId} from '@shared/utils/hash';
import type {TransactionsStackParamList} from '@presentation/navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {CreateTransactionInput} from '@domain/entities/Transaction';
import type {Category} from '@domain/entities/Category';
import type {RouteProp} from '@react-navigation/native';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import {useWallets} from '@presentation/hooks/useWallets';
import {useCategories} from '@presentation/hooks/useCategories';
import {useConvertCurrency} from '@presentation/hooks/useFxRates';
import {WalletPicker} from '@presentation/components/common/WalletPicker';
import {formatAmount} from '@shared/utils/format-currency';
import {ReceiptAttachmentField} from '@presentation/components/ReceiptAttachmentField';

type Nav = NativeStackNavigationProp<TransactionsStackParamList, 'AddTransaction'>;
type Route = RouteProp<TransactionsStackParamList, 'AddTransaction'>;

function categoryIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'category';
}

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

export type AddTransactionFormState = {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  merchant: string;
  notes: string;
  tags: string[];
  transactionDate: number;
  receiptUri: string;
};

export function buildCreateTransactionInputFromForm(
  state: AddTransactionFormState,
  walletId: string,
  transactionId: string,
): CreateTransactionInput {
  const now = Date.now();
  return {
    id: transactionId,
    walletId,
    categoryId: state.categoryId.trim(),
    amount: state.amount,
    currency: state.currency.toUpperCase(),
    type: state.type,
    description: state.description.trim(),
    merchant: state.merchant.trim(),
    source: 'manual',
    tags: state.tags,
    notes: state.notes.trim(),
    receiptUri: state.receiptUri.trim(),
    transactionDate: state.transactionDate,
    createdAt: now,
    updatedAt: now,
  };
}

export default function AddTransactionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {colors, spacing, typography} = useTheme();
  const insets = useSafeAreaInsets();
  const {createTransaction, createWalletTransfer, isSubmitting} = useTransactionActions();
  const {wallets} = useWallets();
  const {categories} = useCategories();
  const {convert} = useConvertCurrency();

  const firstActiveWalletId = useMemo(() => {
    const w = wallets.find((x) => x.isActive);
    return w?.id ?? null;
  }, [wallets]);

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState(DEFAULT_BASE_CURRENCY);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [transactionDate, setTransactionDate] = useState(() => Date.now());
  const [receiptUri, setReceiptUri] = useState('');
  const [newTransactionId] = useState(() => generateId());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryError, setCategoryError] = useState<string | undefined>(undefined);

  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [fromWalletPickerOpen, setFromWalletPickerOpen] = useState(false);
  const [toWalletPickerOpen, setToWalletPickerOpen] = useState(false);
  const [transferFxPreview, setTransferFxPreview] = useState<{
    rate: number;
    convertedCents: number;
  } | null>(null);
  const [transferFxLoading, setTransferFxLoading] = useState(false);

  const transferCategoryId = useMemo(
    () => categories.find((c) => c.name === 'Transfer')?.id ?? '',
    [categories],
  );

  const fromWallet = useMemo(
    () => wallets.find((w) => w.id === fromWalletId) ?? null,
    [fromWalletId, wallets],
  );
  const toWallet = useMemo(
    () => wallets.find((w) => w.id === toWalletId) ?? null,
    [toWalletId, wallets],
  );

  const didInitTransferWalletsRef = useRef(false);

  useEffect(() => {
    if (type !== 'transfer') {
      didInitTransferWalletsRef.current = false;
      return;
    }
    if (didInitTransferWalletsRef.current || wallets.length === 0) {
      return;
    }
    didInitTransferWalletsRef.current = true;
    const active = wallets.find((x) => x.isActive) ?? wallets[0];
    const other = wallets.find((x) => x.id !== active.id);
    setFromWalletId(active.id);
    setToWalletId(other?.id ?? '');
  }, [type, wallets]);

  useEffect(() => {
    let cancelled = false;
    if (type !== 'transfer' || !fromWallet || !toWallet || amount <= 0) {
      setTransferFxPreview(null);
      setTransferFxLoading(false);
      return;
    }
    if (fromWallet.currency === toWallet.currency) {
      setTransferFxPreview({rate: 1, convertedCents: amount});
      setTransferFxLoading(false);
      return;
    }
    setTransferFxLoading(true);
    setTransferFxPreview(null);
    void (async () => {
      const result = await convert(amount, fromWallet.currency, toWallet.currency);
      if (cancelled) {
        return;
      }
      setTransferFxLoading(false);
      if (result) {
        setTransferFxPreview({
          rate: result.rate,
          convertedCents: result.amountCents,
        });
      } else {
        setTransferFxPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, convert, fromWallet, toWallet, type]);

  const paramType = route.params?.type;
  const templateAmount = route.params?.templateAmount;
  const templateCategoryId = route.params?.templateCategoryId;
  const templateDescription = route.params?.templateDescription;
  const templateMerchant = route.params?.templateMerchant;
  const templateCurrency = route.params?.templateCurrency;
  const templateTags = route.params?.templateTags;

  useEffect(() => {
    if (paramType === 'expense' || paramType === 'income' || paramType === 'transfer') {
      setType(paramType);
    }
    if (templateAmount !== undefined && templateAmount > 0) {
      setAmount(templateAmount);
    }
    if (templateCategoryId) {
      setCategoryId(templateCategoryId);
    }
    if (templateDescription !== undefined) {
      setDescription(templateDescription);
    }
    if (templateMerchant !== undefined) {
      setMerchant(templateMerchant);
    }
    if (templateCurrency) {
      setCurrency(templateCurrency.toUpperCase());
    }
    if (templateTags && templateTags.length > 0) {
      setTags([...templateTags]);
    }
  }, [
    paramType,
    templateAmount,
    templateCategoryId,
    templateDescription,
    templateMerchant,
    templateCurrency,
    templateTags,
  ]);

  const categoryMeta = useMemo(
    () => resolveCategory(categoryId, categories),
    [categories, categoryId],
  );

  const categoryPickerFilter = type === 'transfer' ? undefined : type;

  const hasFormData =
    amount > 0 ||
    description.length > 0 ||
    merchant.length > 0 ||
    notes.length > 0 ||
    tags.length > 0 ||
    categoryId.length > 0 ||
    receiptUri.length > 0;

  const handleClear = useCallback(() => {
    setAmount(0);
    setCurrency(DEFAULT_BASE_CURRENCY);
    setCategoryId('');
    setDescription('');
    setMerchant('');
    setNotes('');
    setTags([]);
    setTransactionDate(Date.now());
    setReceiptUri('');
    setCategoryError(undefined);
    setFromWalletId('');
    setToWalletId('');
    setTransferFxPreview(null);
    didInitTransferWalletsRef.current = false;
  }, []);

  const handleSave = useCallback(async () => {
    if (amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }

    if (type === 'transfer') {
      if (!fromWallet || !toWallet) {
        Alert.alert('Wallets required', 'Select both source and destination wallets.');
        return;
      }
      if (fromWallet.id === toWallet.id) {
        Alert.alert('Invalid transfer', 'Choose two different wallets.');
        return;
      }
      if (!transferCategoryId) {
        Alert.alert(
          'Categories missing',
          'Default categories are not loaded. Restart the app or try again.',
        );
        return;
      }
      let amountToCents = amount;
      if (fromWallet.currency !== toWallet.currency) {
        const conv = await convert(amount, fromWallet.currency, toWallet.currency);
        if (!conv) {
          Alert.alert(
            'Exchange rate unavailable',
            'Could not convert between these currencies. Refresh FX rates in settings or try again.',
          );
          return;
        }
        amountToCents = conv.amountCents;
      }
      try {
        await createWalletTransfer({
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          fromWalletCurrency: fromWallet.currency,
          toWalletCurrency: toWallet.currency,
          amountFromCents: amount,
          amountToCents,
          categoryId: transferCategoryId,
          description: description.trim() || undefined,
          merchant: merchant.trim() || undefined,
          userNotes: notes.trim() || undefined,
          tags,
          transactionDate,
          fromWalletName: fromWallet.name,
          toWalletName: toWallet.name,
        });
        navigation.goBack();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        Alert.alert('Could not save transfer', message);
      }
      return;
    }

    if (!categoryId.trim()) {
      setCategoryError('Choose a category');
      Alert.alert('Category required', 'Select a category before saving.');
      return;
    }
    if (!firstActiveWalletId) {
      Alert.alert(
        'No active wallet',
        'Create an active wallet before adding a transaction.',
      );
      return;
    }
    setCategoryError(undefined);

    const input = buildCreateTransactionInputFromForm(
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
      },
      firstActiveWalletId,
      newTransactionId,
    );
    try {
      await createTransaction(input);
      navigation.goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not save transaction', message);
    }
  }, [
    amount,
    categoryId,
    convert,
    createTransaction,
    createWalletTransfer,
    currency,
    description,
    firstActiveWalletId,
    fromWallet,
    merchant,
    navigation,
    newTransactionId,
    notes,
    receiptUri,
    tags,
    toWallet,
    transactionDate,
    transferCategoryId,
    type,
  ]);


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
            <BackButton icon="close" />
            <Text style={[typography.title3, {color: colors.text}]}>Add Transaction</Text>
            {hasFormData ? (
              <Pressable
                accessibilityLabel="Clear form"
                accessibilityRole="button"
                hitSlop={12}
                onPress={handleClear}
                style={styles.headerBtn}>
                <Text
                  style={[
                    typography.callout,
                    {color: colors.danger, fontWeight: '600', textAlign: 'right'},
                  ]}>
                  Clear
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

          {type === 'transfer' ? (
            <>
              <Card onPress={() => setFromWalletPickerOpen(true)} padding="md">
                <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>From Wallet</Text>
                {fromWallet ? (
                  <View style={styles.walletRow}>
                    <View style={[styles.categoryDot, {backgroundColor: fromWallet.color}]} />
                    <View style={styles.walletTextCol}>
                      <Text style={[typography.body, {color: colors.text, fontWeight: '600'}]}>
                        {fromWallet.name}
                      </Text>
                      <Text style={[typography.caption, {color: colors.textTertiary}]}>
                        {fromWallet.currency}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[typography.body, {color: colors.textTertiary}]}>Select source wallet</Text>
                )}
              </Card>

              <Card onPress={() => setToWalletPickerOpen(true)} padding="md">
                <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>To Wallet</Text>
                {toWallet ? (
                  <View style={styles.walletRow}>
                    <View style={[styles.categoryDot, {backgroundColor: toWallet.color}]} />
                    <View style={styles.walletTextCol}>
                      <Text style={[typography.body, {color: colors.text, fontWeight: '600'}]}>
                        {toWallet.name}
                      </Text>
                      <Text style={[typography.caption, {color: colors.textTertiary}]}>
                        {toWallet.currency}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[typography.body, {color: colors.textTertiary}]}>Select destination wallet</Text>
                )}
              </Card>

              <View style={styles.amountBlock}>
                <AmountInput
                  currency={fromWallet?.currency ?? DEFAULT_BASE_CURRENCY}
                  onChangeValue={setAmount}
                  value={amount}
                />
              </View>

              {fromWallet && toWallet && fromWallet.currency !== toWallet.currency && amount > 0 ? (
                <Card padding="md">
                  <Text style={[styles.cardLabel, {color: colors.textSecondary}]}>Conversion</Text>
                  {transferFxLoading ? (
                    <Text style={[typography.body, {color: colors.textTertiary, marginTop: 8}]}>
                      Loading exchange rate…
                    </Text>
                  ) : transferFxPreview ? (
                    <View style={{marginTop: 8, gap: 6}}>
                      <Text style={[typography.body, {color: colors.text}]}>
                        1 {fromWallet.currency} = {transferFxPreview.rate.toFixed(6)} {toWallet.currency}
                      </Text>
                      <Text style={[typography.body, {color: colors.text, fontWeight: '600'}]}>
                        Receives {formatAmount(transferFxPreview.convertedCents, toWallet.currency)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.inlineError, {color: colors.danger, marginTop: 8}]}>
                      No FX rate for this pair. Configure FX_API_KEY or refresh rates, then try again.
                    </Text>
                  )}
                </Card>
              ) : null}
            </>
          ) : (
            <>
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
            </>
          )}

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

          <NotesEditor
            value={notes}
            onChangeText={setNotes}
          />

          <TagInput
            tags={tags}
            onTagsChange={setTags}
          />

          {type !== 'transfer' ? (
            <ReceiptAttachmentField
              onChange={setReceiptUri}
              storageKeyId={newTransactionId}
              value={receiptUri}
            />
          ) : null}

          <Button
            fullWidth
            loading={isSubmitting}
            onPress={handleSave}
            size="lg"
            title={type === 'transfer' ? 'Save Transfer' : 'Save Transaction'}
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
        excludeWalletIds={toWalletId ? [toWalletId] : []}
        onClose={() => setFromWalletPickerOpen(false)}
        onSelect={setFromWalletId}
        selectedWalletId={fromWalletId || undefined}
        title="From wallet"
        visible={fromWalletPickerOpen}
        wallets={wallets}
      />

      <WalletPicker
        excludeWalletIds={fromWalletId ? [fromWalletId] : []}
        onClose={() => setToWalletPickerOpen(false)}
        onSelect={setToWalletId}
        selectedWalletId={toWalletId || undefined}
        title="To wallet"
        visible={toWalletPickerOpen}
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
