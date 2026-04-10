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
import {useSubscriptionActions, useSubscriptions} from '@presentation/hooks/useSubscriptions';
import {useAppStore} from '@presentation/stores/useAppStore';
import {generateId} from '@shared/utils/hash';
import type {BillingCycle, Subscription} from '@domain/entities/Subscription';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CreateSubscription'>;
type CreateSubscriptionRouteProp = RouteProp<SettingsStackParamList, 'CreateSubscription'>;

const BILLING_CYCLES: {key: BillingCycle; label: string}[] = [
  {key: 'weekly', label: 'Weekly'},
  {key: 'monthly', label: 'Monthly'},
  {key: 'quarterly', label: 'Quarterly'},
  {key: 'yearly', label: 'Yearly'},
];

const SUB_COLORS = [
  '#6C5CE7', '#00B894', '#0984E3', '#E17055', '#FD79A8',
  '#636E72', '#E74C3C', '#2ECC71', '#3498DB', '#9B59B6',
  '#F39C12', '#1ABC9C',
];

const SUB_ICONS: {key: string; mdi: string}[] = [
  {key: 'play-circle', mdi: 'play-circle-outline'},
  {key: 'music', mdi: 'music'},
  {key: 'cloud', mdi: 'cloud-outline'},
  {key: 'dumbbell', mdi: 'dumbbell'},
  {key: 'newspaper', mdi: 'newspaper-variant-outline'},
  {key: 'shield', mdi: 'shield-check-outline'},
  {key: 'cellphone', mdi: 'cellphone'},
  {key: 'wifi', mdi: 'wifi'},
];

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ts));
}

export default function CreateSubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<CreateSubscriptionRouteProp>();
  const editSubscriptionId = route.params?.editSubscriptionId;
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {subscriptions} = useSubscriptions();
  const {saveSubscription, updateSubscription, isSubmitting} = useSubscriptionActions();

  const [baseline, setBaseline] = useState<Subscription | null>(null);
  const hydratedEditId = useRef<string | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState(baseCurrency);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [nextDueDate, setNextDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.getTime();
  });
  const [categoryId, setCategoryId] = useState('');
  const [icon, setIcon] = useState('play-circle');
  const [color, setColor] = useState('#6C5CE7');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  useEffect(() => {
    if (!editSubscriptionId) {
      hydratedEditId.current = null;
      setBaseline(null);
      return;
    }
    if (hydratedEditId.current === editSubscriptionId) {
      return;
    }
    const sub = subscriptions.find((s) => s.id === editSubscriptionId);
    if (!sub) {
      return;
    }
    hydratedEditId.current = editSubscriptionId;
    setBaseline(sub);
    setName(sub.name);
    setAmount(sub.amount);
    setCurrency(sub.currency);
    setBillingCycle(sub.billingCycle);
    setNextDueDate(sub.nextDueDate);
    setCategoryId(sub.categoryId === 'uncategorized' ? '' : sub.categoryId);
    setIcon(SUB_ICONS.some((i) => i.key === sub.icon) ? sub.icon : 'play-circle');
    setColor(sub.color);
  }, [editSubscriptionId, subscriptions]);

  const isEditing = baseline != null;
  const selectedMdi = SUB_ICONS.find((i) => i.key === icon)?.mdi ?? 'play-circle-outline';
  const canSave = name.trim().length > 0 && amount > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || isSubmitting) return;
    const now = Date.now();
    try {
      if (baseline) {
        await updateSubscription({
          id: baseline.id,
          name: name.trim(),
          amount,
          currency: currency.toUpperCase(),
          billingCycle,
          nextDueDate,
          categoryId: categoryId || 'uncategorized',
          isActive: baseline.isActive,
          cancelledAt: baseline.cancelledAt,
          icon,
          color,
          createdAt: baseline.createdAt,
          updatedAt: now,
        });
      } else {
        await saveSubscription({
          id: generateId(),
          name: name.trim(),
          amount,
          currency: currency.toUpperCase(),
          billingCycle,
          nextDueDate,
          categoryId: categoryId || 'uncategorized',
          isActive: true,
          icon,
          color,
          createdAt: now,
          updatedAt: now,
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save subscription');
    }
  }, [
    baseline,
    canSave,
    isSubmitting,
    saveSubscription,
    updateSubscription,
    name,
    amount,
    currency,
    billingCycle,
    nextDueDate,
    categoryId,
    icon,
    color,
    navigation,
  ]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight, paddingHorizontal: spacing.base, paddingTop: insets.top + 12}]}>
        <View style={styles.headerRow}>
          <BackButton icon="close" />
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {isEditing ? 'Edit Subscription' : 'New Subscription'}
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

        <View style={[styles.previewCard, {backgroundColor: color, borderRadius: radius.lg, padding: spacing.lg}, shadows.md]}>
          <AppIcon name={selectedMdi} size={40} color="#FFFFFF" />
          <Text numberOfLines={1} style={styles.previewName}>{name.trim() || 'Subscription'}</Text>
          <Text style={styles.previewSub}>{billingCycle} / {currency.toUpperCase()}</Text>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>NAME</Text>
          <View style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <TextInput
              autoFocus={!isEditing}
              maxLength={40}
              onChangeText={setName}
              placeholder="e.g. Netflix, Spotify"
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
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>BILLING CYCLE</Text>
          <View style={[styles.cycleRow, {gap: spacing.sm}]}>
            {BILLING_CYCLES.map((c) => {
              const active = billingCycle === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setBillingCycle(c.key)}
                  style={[
                    styles.cycleChip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.borderLight,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <Text style={[styles.cycleLabel, {color: active ? '#FFFFFF' : colors.textSecondary}]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>NEXT DUE DATE</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <Text style={[styles.dateValue, {color: colors.text}]}>{formatDate(nextDueDate)}</Text>
            <AppIcon name="calendar" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            minimumDate={isEditing ? undefined : new Date()}
            mode="date"
            onChange={(_e, selected) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (selected) setNextDueDate(selected.getTime());
            }}
            value={new Date(nextDueDate)}
          />
        )}

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

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>ICON</Text>
          <View style={styles.iconGrid}>
            {SUB_ICONS.map((o) => {
              const active = icon === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setIcon(o.key)}
                  style={[
                    styles.iconCell,
                    {
                      backgroundColor: active ? `${color}22` : colors.card,
                      borderColor: active ? color : colors.borderLight,
                      borderRadius: radius.md,
                    },
                  ]}>
                  <AppIcon name={o.mdi} size={22} color={active ? color : colors.textSecondary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>COLOR</Text>
          <View style={styles.colorGrid}>
            {SUB_COLORS.map((c) => {
              const active = color === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorCell, {backgroundColor: c, borderColor: active ? colors.text : 'transparent', borderWidth: active ? 3 : 0}]}>
                  {active && <Text style={styles.colorCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{marginTop: spacing['2xl']}}>
          <Button
            disabled={!canSave}
            fullWidth
            loading={isSubmitting}
            onPress={handleSave}
            size="lg"
            title={isEditing ? 'Save Changes' : 'Create Subscription'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 0, paddingBottom: 12},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  previewCard: {alignItems: 'center', gap: 8},
  previewName: {fontSize: 22, fontWeight: fontWeight.bold, color: '#FFFFFF'},
  previewSub: {fontSize: 14, fontWeight: fontWeight.semibold, color: 'rgba(255,255,255,0.8)'},
  sectionTitle: {fontSize: 12, fontWeight: fontWeight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8},
  inputWrap: {flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, height: 48},
  textInput: {flex: 1, fontSize: 16, padding: 0},
  dateValue: {flex: 1, fontSize: 16, fontWeight: fontWeight.medium},
  amountWrap: {borderWidth: StyleSheet.hairlineWidth},
  cycleRow: {flexDirection: 'row', flexWrap: 'wrap'},
  cycleChip: {borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10},
  cycleLabel: {fontSize: 14, fontWeight: fontWeight.medium},
  iconGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  iconCell: {width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2},
  colorGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  colorCell: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
  colorCheck: {color: '#FFFFFF', fontSize: 18, fontWeight: fontWeight.bold, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2},
});
