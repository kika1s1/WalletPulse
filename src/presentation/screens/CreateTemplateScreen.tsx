import React, {useCallback, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton, Button, Chip, Input} from '@presentation/components/common';
import {AmountInput} from '@presentation/components/common/AmountInput';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {CategoryPicker} from '@presentation/components/common/CategoryPicker';
import {TagInput} from '@presentation/components/TagInput';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTemplates} from '@presentation/hooks/useTemplates';
import {useAppStore} from '@presentation/stores/useAppStore';
import {validateTemplate} from '@domain/usecases/quick-action-templates';
import {DEFAULT_BASE_CURRENCY} from '@shared/constants/currencies';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CreateTemplate'>;

const HEX_RE = /^#([0-9A-Fa-f]{6})$/;

export default function CreateTemplateScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, shadows} = useTheme();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {addTemplate} = useTemplates();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('receipt');
  const [color, setColor] = useState('#6C5CE7');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState(baseCurrency || DEFAULT_BASE_CURRENCY);
  const [categoryId, setCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = useCallback(async () => {
    const v = validateTemplate({name, icon, color, type});
    if (v) {
      Alert.alert('Check form', v);
      return;
    }
    const c = color.trim();
    if (!HEX_RE.test(c)) {
      Alert.alert('Check form', 'Color must be a hex value like #RRGGBB');
      return;
    }
    setIsSubmitting(true);
    try {
      await addTemplate({
        name: name.trim(),
        icon: icon.trim(),
        color: c,
        type,
        categoryId: categoryId.trim() || undefined,
        amount: amount > 0 ? amount : undefined,
        currency: currency.trim().toUpperCase() || undefined,
        merchant: merchant.trim() || undefined,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save template');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addTemplate,
    amount,
    categoryId,
    color,
    currency,
    description,
    icon,
    merchant,
    name,
    navigation,
    tags,
    type,
  ]);

  const categoryLabel = categoryId.trim() ? categoryId : 'Select category';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
            paddingTop: insets.top + 12,
          },
        ]}>
        <View style={styles.headerRow}>
          <BackButton icon="close" />
          <Text style={[styles.headerTitle, {color: colors.text}]}>New Template</Text>
          <View style={{width: 60}} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing.base,
            paddingBottom: spacing['4xl'],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Input label="Name" onChangeText={setName} placeholder="e.g. Gym" value={name} maxLength={40} />

          <View style={{marginTop: spacing.lg}}>
            <Input
              label="Icon name"
              onChangeText={setIcon}
              placeholder="receipt, coffee, cart"
              value={icon}
              helperText="Uses app icon keys (see Quick Templates)"
            />
          </View>

          <View style={{marginTop: spacing.lg}}>
            <Input
              label="Color (hex)"
              onChangeText={setColor}
              placeholder="#6C5CE7"
              value={color}
            />
          </View>

          <View style={{marginTop: spacing.lg}}>
            <Text style={[styles.sectionLabel, {color: colors.textSecondary}]}>Type</Text>
            <View style={[styles.typeRow, {gap: spacing.sm}]}>
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
            </View>
          </View>

          <View style={{marginTop: spacing.xl}}>
            <Text style={[styles.sectionLabel, {color: colors.textSecondary}]}>Amount</Text>
            <View
              style={[
                styles.amountWrap,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                },
                shadows.sm,
              ]}>
              <AmountInput
                currency={currency}
                onChangeValue={setAmount}
                onCurrencyPress={() => setCurrencyPickerOpen(true)}
                value={amount}
              />
            </View>
          </View>

          <View style={{marginTop: spacing.lg}}>
            <Text style={[styles.sectionLabel, {color: colors.textSecondary}]}>Category</Text>
            <Pressable
              onPress={() => setCategoryPickerOpen(true)}
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  borderRadius: radius.md,
                },
              ]}>
              <Text
                style={{
                  color: categoryId ? colors.text : colors.textTertiary,
                  fontSize: 16,
                  flex: 1,
                  fontWeight: categoryId ? fontWeight.medium : fontWeight.regular,
                }}>
                {categoryLabel}
              </Text>
              <AppIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </Pressable>
          </View>

          <View style={{marginTop: spacing.lg}}>
            <Input label="Merchant" onChangeText={setMerchant} placeholder="Optional" value={merchant} />
          </View>

          <View style={{marginTop: spacing.lg}}>
            <Input
              label="Description"
              onChangeText={setDescription}
              placeholder="Optional"
              value={description}
              multiline
            />
          </View>

          <View style={{marginTop: spacing.lg}}>
            <Text style={[styles.sectionLabel, {color: colors.textSecondary}]}>Tags</Text>
            <TagInput onTagsChange={setTags} tags={tags} />
          </View>

          <View style={{marginTop: spacing['2xl']}}>
            <Button
              disabled={!name.trim() || isSubmitting}
              fullWidth
              loading={isSubmitting}
              onPress={() => void handleSave()}
              size="lg"
              title="Save template"
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
        type={type}
        visible={categoryPickerOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  sectionLabel: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    marginBottom: 8,
  },
  typeRow: {flexDirection: 'row', flexWrap: 'wrap'},
  amountWrap: {borderWidth: StyleSheet.hairlineWidth},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    minHeight: 48,
  },
});
