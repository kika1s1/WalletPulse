import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
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
import {AmountInput} from '@presentation/components/common/AmountInput';
import {Button} from '@presentation/components/common/Button';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {useGoalActions} from '@presentation/hooks/useGoals';
import {useAppStore} from '@presentation/stores/useAppStore';
import {generateId} from '@shared/utils/hash';
import type {Goal, GoalCategory} from '@domain/entities/Goal';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CreateGoal'>;
type Route = RouteProp<SettingsStackParamList, 'CreateGoal'>;

const GOAL_CATEGORIES: {key: GoalCategory; label: string; icon: string}[] = [
  {key: 'emergency', label: 'Emergency Fund', icon: 'shield-outline'},
  {key: 'vacation', label: 'Vacation', icon: 'airplane'},
  {key: 'purchase', label: 'Purchase', icon: 'cart-outline'},
  {key: 'investment', label: 'Investment', icon: 'trending-up'},
  {key: 'custom', label: 'Custom', icon: 'star-outline'},
];

const GOAL_COLORS = [
  '#6C5CE7', '#00B894', '#0984E3', '#E17055', '#FD79A8',
  '#636E72', '#E74C3C', '#2ECC71', '#3498DB', '#9B59B6',
  '#F39C12', '#1ABC9C',
];

const GOAL_ICONS: {key: string; mdi: string}[] = [
  {key: 'piggy-bank', mdi: 'piggy-bank-outline'},
  {key: 'flag', mdi: 'flag-outline'},
  {key: 'home', mdi: 'home-outline'},
  {key: 'car', mdi: 'car-outline'},
  {key: 'airplane', mdi: 'airplane'},
  {key: 'school', mdi: 'school-outline'},
  {key: 'medical', mdi: 'medical-bag'},
  {key: 'gift', mdi: 'gift-outline'},
];

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ts));
}

export default function CreateGoalScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.editGoalId;
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {saveGoal, updateGoal, isSubmitting} = useGoalActions();

  const [existing, setExisting] = useState<Goal | null>(null);
  const [editLoading, setEditLoading] = useState(!!editId);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [currency, setCurrency] = useState(baseCurrency);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.getTime();
  });
  const [category, setCategory] = useState<GoalCategory>('custom');
  const [icon, setIcon] = useState('piggy-bank');
  const [color, setColor] = useState('#6C5CE7');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  useEffect(() => {
    if (!editId) {
      setEditLoading(false);
      return;
    }
    let mounted = true;
    setEditLoading(true);
    (async () => {
      const g = await getLocalDataSource().goals.findById(editId);
      if (!mounted) {
        return;
      }
      if (g) {
        setExisting(g);
        setName(g.name);
        setTargetAmount(g.targetAmount);
        setCurrency(g.currency);
        setDeadline(g.deadline);
        setCategory(g.category);
        setIcon(g.icon);
        setColor(g.color);
      } else {
        Alert.alert('Goal not found', 'This goal is no longer available.', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
      setEditLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [editId, navigation]);

  const selectedMdi = GOAL_ICONS.find((i) => i.key === icon)?.mdi ?? 'piggy-bank-outline';
  const canSave = name.trim().length > 0 && targetAmount > 0;
  const isEditing = existing !== null;

  const handleSave = useCallback(async () => {
    if (!canSave || isSubmitting) {
      return;
    }
    const now = Date.now();
    try {
      if (existing) {
        await updateGoal({
          ...existing,
          name: name.trim(),
          targetAmount,
          currency: currency.toUpperCase(),
          deadline,
          icon,
          color,
          category,
          updatedAt: now,
        });
      } else {
        await saveGoal({
          id: generateId(),
          name: name.trim(),
          targetAmount,
          currentAmount: 0,
          currency: currency.toUpperCase(),
          deadline,
          icon,
          color,
          category,
          isCompleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : isEditing ? 'Failed to update goal' : 'Failed to create goal',
      );
    }
  }, [
    canSave,
    category,
    color,
    currency,
    deadline,
    existing,
    icon,
    isEditing,
    isSubmitting,
    name,
    navigation,
    saveGoal,
    targetAmount,
    updateGoal,
  ]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight, paddingHorizontal: spacing.base, paddingTop: insets.top + 12}]}>
        <View style={styles.headerRow}>
          <Pressable accessibilityLabel="Cancel" accessibilityRole="button" hitSlop={12} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelBtn, {color: colors.textSecondary}]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {editId ? 'Edit Goal' : 'New Goal'}
          </Text>
          <View style={{width: 60}} />
        </View>
      </View>

      {editLoading ? (
        <View style={[styles.loadingBox, {backgroundColor: colors.background}]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
      <ScrollView
        contentContainerStyle={{padding: spacing.base, paddingBottom: spacing['4xl']}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={[styles.previewCard, {backgroundColor: color, borderRadius: radius.lg, padding: spacing.lg}, shadows.md]}>
          <AppIcon name={selectedMdi} size={40} color="#FFFFFF" />
          <Text numberOfLines={1} style={styles.previewName}>{name.trim() || 'Goal Name'}</Text>
          <Text style={styles.previewSub}>{currency.toUpperCase()}</Text>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>NAME</Text>
          <View style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <TextInput
              autoFocus={!isEditing}
              maxLength={40}
              onChangeText={setName}
              placeholder="e.g. Emergency Fund"
              placeholderTextColor={colors.textTertiary}
              style={[styles.textInput, {color: colors.text}]}
              value={name}
            />
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>TARGET AMOUNT</Text>
          <View style={[styles.amountWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md}, shadows.sm]}>
            <AmountInput
              currency={currency}
              onChangeValue={setTargetAmount}
              onCurrencyPress={() => setCurrencyPickerOpen(true)}
              value={targetAmount}
            />
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>DEADLINE</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <Text style={[styles.dateValue, {color: colors.text}]}>{formatDate(deadline)}</Text>
            <AppIcon name="calendar" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            minimumDate={isEditing ? undefined : new Date()}
            mode="date"
            onChange={(_e, selected) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
              }
              if (selected) {
                setDeadline(selected.getTime());
              }
            }}
            value={new Date(deadline)}
          />
        )}

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>CATEGORY</Text>
          <View style={{gap: spacing.xs}}>
            {GOAL_CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  style={[
                    styles.catRow,
                    {
                      backgroundColor: active ? `${color}18` : colors.card,
                      borderColor: active ? color : colors.borderLight,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.base,
                      paddingVertical: spacing.md,
                    },
                  ]}>
                  <AppIcon name={cat.icon} size={18} color={active ? color : colors.textSecondary} />
                  <Text style={[styles.catLabel, {color: active ? color : colors.text, fontWeight: active ? fontWeight.semibold : fontWeight.regular}]}>
                    {cat.label}
                  </Text>
                  {active && <Text style={[styles.check, {color}]}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>ICON</Text>
          <View style={styles.iconGrid}>
            {GOAL_ICONS.map((o) => {
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
            {GOAL_COLORS.map((c) => {
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
            title={isEditing ? 'Save Changes' : 'Create Goal'}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      )}

      <CurrencyPicker
        onClose={() => setCurrencyPickerOpen(false)}
        onSelect={setCurrency}
        selectedCode={currency}
        visible={currencyPickerOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingBox: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header: {borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 0, paddingBottom: 12},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  cancelBtn: {fontSize: 16, fontWeight: fontWeight.medium},
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  previewCard: {alignItems: 'center', gap: 8},
  previewName: {fontSize: 22, fontWeight: fontWeight.bold, color: '#FFFFFF'},
  previewSub: {fontSize: 14, fontWeight: fontWeight.semibold, color: 'rgba(255,255,255,0.8)'},
  sectionTitle: {fontSize: 12, fontWeight: fontWeight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8},
  inputWrap: {flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, height: 48},
  textInput: {flex: 1, fontSize: 16, padding: 0},
  dateValue: {flex: 1, fontSize: 16, fontWeight: fontWeight.medium},
  amountWrap: {borderWidth: StyleSheet.hairlineWidth},
  catRow: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 10},
  catLabel: {flex: 1, fontSize: 14},
  check: {fontSize: 16, fontWeight: fontWeight.bold},
  iconGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  iconCell: {width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2},
  colorGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  colorCell: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
  colorCheck: {color: '#FFFFFF', fontSize: 18, fontWeight: fontWeight.bold, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2},
});
