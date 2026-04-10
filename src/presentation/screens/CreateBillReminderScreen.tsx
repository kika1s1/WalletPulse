import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common';
import {AmountInput} from '@presentation/components/common/AmountInput';
import {Button} from '@presentation/components/common/Button';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {CategoryPicker} from '@presentation/components/common/CategoryPicker';
import {useBillReminderActions, useBillReminders} from '@presentation/hooks/useBillReminders';
import {useAppStore} from '@presentation/stores/useAppStore';
import {generateId} from '@shared/utils/hash';
import type {BillRecurrence, BillReminder} from '@domain/entities/BillReminder';
import {WalletPicker} from '@presentation/components/common/WalletPicker';
import {useWallets} from '@presentation/hooks/useWallets';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CreateBillReminder'>;
type CreateRoute = RouteProp<SettingsStackParamList, 'CreateBillReminder'>;

const RECURRENCE_OPTIONS: {key: BillRecurrence; label: string}[] = [
  {key: 'once', label: 'One-time'},
  {key: 'weekly', label: 'Weekly'},
  {key: 'monthly', label: 'Monthly'},
  {key: 'quarterly', label: 'Quarterly'},
  {key: 'yearly', label: 'Yearly'},
];

const REMIND_OPTIONS = [
  {days: 0, label: 'On due date'},
  {days: 1, label: '1 day before'},
  {days: 3, label: '3 days before'},
  {days: 7, label: '1 week before'},
  {days: 14, label: '2 weeks before'},
];

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ts));
}

export default function CreateBillReminderScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<CreateRoute>();
  const editBillId = route.params?.editBillId;
  const isEditing = Boolean(editBillId);

  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {bills, isLoading} = useBillReminders();
  const {saveBill, updateBill, isSubmitting} = useBillReminderActions();
  const {wallets} = useWallets();
  const activeWallets = wallets.filter((w) => w.isActive);
  const [baseline, setBaseline] = useState<BillReminder | null>(null);
  const missingBillAlertedRef = useRef(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState(baseCurrency);
  const [walletId, setWalletId] = useState('');
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const selectedWallet = activeWallets.find((w) => w.id === walletId);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.getTime();
  });
  const [recurrence, setRecurrence] = useState<BillRecurrence>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [remindDaysBefore, setRemindDaysBefore] = useState(3);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  useEffect(() => {
    if (editBillId) {
      return;
    }
    setBaseline(null);
    setName('');
    setAmount(0);
    setCurrency(baseCurrency);
    setWalletId(activeWallets.length > 0 ? activeWallets[0].id : '');
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setDueDate(d.getTime());
    setRecurrence('monthly');
    setCategoryId('');
    setRemindDaysBefore(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBillId, baseCurrency]);

  useEffect(() => {
    if (!editBillId) {
      return;
    }
    const found = bills.find((b) => b.id === editBillId);
    if (!found) {
      return;
    }
    setBaseline(found);
    setName(found.name);
    setAmount(found.amount);
    setCurrency(found.currency);
    setWalletId(found.walletId || (activeWallets.length > 0 ? activeWallets[0].id : ''));
    setDueDate(found.dueDate);
    setRecurrence(found.recurrence);
    setCategoryId(found.categoryId === 'uncategorized' ? '' : found.categoryId);
    setRemindDaysBefore(found.remindDaysBefore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBillId, bills]);

  useEffect(() => {
    if (!editBillId) {
      missingBillAlertedRef.current = false;
      return;
    }
    if (isLoading) {
      return;
    }
    const found = bills.some((b) => b.id === editBillId);
    if (found) {
      missingBillAlertedRef.current = false;
      return;
    }
    if (missingBillAlertedRef.current) {
      return;
    }
    missingBillAlertedRef.current = true;
    Alert.alert('Not found', 'This bill reminder no longer exists.', [
      {text: 'OK', onPress: () => navigation.goBack()},
    ]);
  }, [editBillId, bills, isLoading, navigation]);

  const canSave = name.trim().length > 0 && amount > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || isSubmitting) {return;}
    const now = Date.now();
    try {
      if (isEditing && baseline) {
        await updateBill({
          id: baseline.id,
          name: name.trim(),
          amount,
          currency: currency.toUpperCase(),
          dueDate,
          recurrence,
          categoryId: categoryId || 'uncategorized',
          walletId,
          isPaid: baseline.isPaid,
          paidTransactionId: baseline.paidTransactionId,
          remindDaysBefore,
          createdAt: baseline.createdAt,
          updatedAt: now,
        });
      } else {
        await saveBill({
          id: generateId(),
          name: name.trim(),
          amount,
          currency: currency.toUpperCase(),
          dueDate,
          recurrence,
          categoryId: categoryId || 'uncategorized',
          walletId,
          isPaid: false,
          remindDaysBefore,
          createdAt: now,
          updatedAt: now,
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : isEditing ? 'Failed to update reminder' : 'Failed to create reminder',
      );
    }
  }, [
    baseline,
    canSave,
    isEditing,
    isSubmitting,
    saveBill,
    updateBill,
    name,
    amount,
    currency,
    walletId,
    dueDate,
    recurrence,
    categoryId,
    remindDaysBefore,
    navigation,
  ]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight, paddingHorizontal: spacing.base, paddingTop: insets.top + 12}]}>
        <View style={styles.headerRow}>
          <BackButton icon="close" />
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {isEditing ? 'Edit Bill Reminder' : 'New Bill Reminder'}
          </Text>
          <View style={{width: 60}} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
      <ScrollView
        contentContainerStyle={{padding: spacing.base, paddingBottom: spacing['4xl']}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={{marginTop: spacing.sm}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>NAME</Text>
          <View style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <TextInput
              autoFocus={!isEditing}
              maxLength={40}
              onChangeText={setName}
              placeholder="e.g. Rent, Electric, Internet"
              placeholderTextColor={colors.textTertiary}
              style={[styles.textInput, {color: colors.text}]}
              value={name}
            />
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>AMOUNT</Text>
          <View style={[styles.amountWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md}, shadows.sm]}>
            <AmountInput
              currency={currency}
              onChangeValue={setAmount}
              onCurrencyPress={() => setCurrencyPickerOpen(true)}
              value={amount}
            />
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>WALLET</Text>
          <Pressable
            onPress={() => setWalletPickerOpen(true)}
            style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <AppIcon name="wallet-outline" size={20} color={selectedWallet ? colors.primary : colors.textTertiary} />
            <Text style={[{color: selectedWallet ? colors.text : colors.textTertiary, fontSize: 16, flex: 1, marginLeft: 10, fontWeight: selectedWallet ? fontWeight.medium : fontWeight.regular}]}>
              {selectedWallet ? `${selectedWallet.name} (${selectedWallet.currency})` : 'Select wallet'}
            </Text>
            <AppIcon name="chevron-down" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>DUE DATE</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <Text style={[styles.dateValue, {color: colors.text}]}>{formatDate(dueDate)}</Text>
            <AppIcon name="calendar" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            minimumDate={isEditing ? undefined : new Date()}
            mode="date"
            onChange={(_e, selected) => {
              if (Platform.OS === 'android') {setShowDatePicker(false);}
              if (selected) {setDueDate(selected.getTime());}
            }}
            value={new Date(dueDate)}
          />
        )}

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>RECURRENCE</Text>
          <View style={[styles.cycleRow, {gap: spacing.xs}]}>
            {RECURRENCE_OPTIONS.map((r) => {
              const active = recurrence === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRecurrence(r.key)}
                  style={[
                    styles.cycleChip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.borderLight,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <Text style={[styles.cycleLabel, {color: active ? '#FFFFFF' : colors.textSecondary}]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>REMIND ME</Text>
          <View style={{gap: spacing.xs}}>
            {REMIND_OPTIONS.map((opt) => {
              const active = remindDaysBefore === opt.days;
              return (
                <Pressable
                  key={opt.days}
                  onPress={() => setRemindDaysBefore(opt.days)}
                  style={[
                    styles.remindRow,
                    {
                      backgroundColor: active ? `${colors.primary}18` : colors.card,
                      borderColor: active ? colors.primary : colors.borderLight,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.base,
                      paddingVertical: spacing.md,
                    },
                  ]}>
                  <AppIcon
                    name={active ? 'bell-ring-outline' : 'bell-outline'}
                    size={18}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.remindLabel, {color: active ? colors.primary : colors.text, fontWeight: active ? fontWeight.semibold : fontWeight.regular}]}>
                    {opt.label}
                  </Text>
                  {active && <Text style={[styles.check, {color: colors.primary}]}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>CATEGORY</Text>
          <Pressable
            onPress={() => setCategoryPickerOpen(true)}
            style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <Text style={[{color: categoryId ? colors.text : colors.textTertiary, fontSize: 16, flex: 1, fontWeight: categoryId ? fontWeight.medium : fontWeight.regular}]}>
              {categoryId || 'Select category'}
            </Text>
            <AppIcon name="chevron-down" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{marginTop: spacing['2xl']}}>
          <Button
            disabled={!canSave || (isEditing && !baseline)}
            fullWidth
            loading={isSubmitting}
            onPress={handleSave}
            size="lg"
            title={isEditing ? 'Save changes' : 'Create Reminder'}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <CurrencyPicker
        onClose={() => setCurrencyPickerOpen(false)}
        onSelect={setCurrency}
        selectedCode={currency}
        visible={currencyPickerOpen}
      />

      <CategoryPicker
        onClose={() => setCategoryPickerOpen(false)}
        onSelect={setCategoryId}
        selectedId={categoryId || undefined}
        type="expense"
        visible={categoryPickerOpen}
      />

      <WalletPicker
        onClose={() => setWalletPickerOpen(false)}
        onSelect={(id) => {
          setWalletId(id);
          const w = activeWallets.find((aw) => aw.id === id);
          if (w) {
            setCurrency(w.currency);
          }
        }}
        wallets={activeWallets}
        selectedWalletId={walletId || undefined}
        visible={walletPickerOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 0, paddingBottom: 12},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  sectionTitle: {fontSize: 12, fontWeight: fontWeight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8},
  inputWrap: {flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, height: 48},
  textInput: {flex: 1, fontSize: 16, padding: 0},
  dateValue: {flex: 1, fontSize: 16, fontWeight: fontWeight.medium},
  amountWrap: {borderWidth: StyleSheet.hairlineWidth},
  cycleRow: {flexDirection: 'row', flexWrap: 'wrap'},
  cycleChip: {borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10},
  cycleLabel: {fontSize: 13, fontWeight: fontWeight.medium},
  remindRow: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 10},
  remindLabel: {flex: 1, fontSize: 14},
  check: {fontSize: 16, fontWeight: fontWeight.bold},
});
