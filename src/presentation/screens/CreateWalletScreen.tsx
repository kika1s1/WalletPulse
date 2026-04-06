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
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Button} from '@presentation/components/common/Button';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeCreateWallet} from '@domain/usecases/create-wallet';
import {generateId} from '@shared/utils/hash';
import {useAppStore} from '@presentation/stores/useAppStore';
import {useWallets} from '@presentation/hooks/useWallets';
import type {WalletsStackParamList} from '@presentation/navigation/types';

type Nav = NativeStackNavigationProp<WalletsStackParamList, 'CreateWallet' | 'EditWallet'>;
type WalletFormRoute = RouteProp<WalletsStackParamList, 'CreateWallet' | 'EditWallet'>;

function iconKeyFromStored(stored: string): string {
  const byMdi = WALLET_ICONS.find((i) => i.mdi === stored);
  if (byMdi) return byMdi.key;
  const byKey = WALLET_ICONS.find((i) => i.key === stored);
  if (byKey) return byKey.key;
  return 'wallet';
}

const WALLET_COLORS = [
  '#6C5CE7', '#00B894', '#0984E3', '#E17055', '#FD79A8',
  '#636E72', '#E74C3C', '#2ECC71', '#3498DB', '#9B59B6',
  '#F39C12', '#1ABC9C',
];

const WALLET_ICONS: {key: string; mdi: string}[] = [
  {key: 'wallet', mdi: 'wallet-outline'},
  {key: 'bank', mdi: 'bank-outline'},
  {key: 'cash', mdi: 'cash'},
  {key: 'credit-card', mdi: 'credit-card-outline'},
  {key: 'piggy-bank', mdi: 'piggy-bank-outline'},
  {key: 'safe', mdi: 'safe'},
  {key: 'chart', mdi: 'chart-line'},
  {key: 'briefcase', mdi: 'briefcase-outline'},
];

export default function CreateWalletScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<WalletFormRoute>();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {wallets, isLoading: walletsLoading, updateWallet} = useWallets();

  const p = route.params;
  const editWalletId: string | undefined =
    p == null ? undefined : 'walletId' in p ? p.walletId : p.editWalletId;
  const isEditing = Boolean(editWalletId);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState('#6C5CE7');
  const [isSaving, setIsSaving] = useState(false);
  const hydratedForId = useRef<string | null>(null);

  useEffect(() => {
    if (!editWalletId) {
      hydratedForId.current = null;
      return;
    }
    if (hydratedForId.current === editWalletId) return;
    if (walletsLoading) return;
    const w = wallets.find((x) => x.id === editWalletId);
    if (!w) {
      Alert.alert('Error', 'Wallet not found');
      navigation.goBack();
      return;
    }
    hydratedForId.current = editWalletId;
    setName(w.name);
    setCurrency(w.currency.toUpperCase());
    setIcon(iconKeyFromStored(w.icon));
    setColor(w.color);
  }, [editWalletId, wallets, walletsLoading, navigation]);

  const selectedMdi = WALLET_ICONS.find((i) => i.key === icon)?.mdi ?? 'wallet-outline';
  const canSave = name.trim().length > 0 && currency.length === 3;

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);

    try {
      if (editWalletId) {
        await updateWallet(editWalletId, {
          name: name.trim(),
          currency: currency.toUpperCase(),
          icon,
          color,
        });
      } else {
        const ds = getLocalDataSource();
        const create = makeCreateWallet({walletRepo: ds.wallets});
        const allWallets = await ds.wallets.findAll();
        const now = Date.now();

        await create({
          id: generateId(),
          name: name.trim(),
          currency: currency.toUpperCase(),
          balance: 0,
          isActive: true,
          icon,
          color,
          sortOrder: allWallets.length,
          createdAt: now,
          updatedAt: now,
        });
      }

      navigation.goBack();
    } catch (e) {
      const fallback = isEditing ? 'Failed to update wallet' : 'Failed to create wallet';
      Alert.alert('Error', e instanceof Error ? e.message : fallback);
    } finally {
      setIsSaving(false);
    }
  }, [
    canSave,
    isSaving,
    name,
    currency,
    icon,
    color,
    navigation,
    editWalletId,
    updateWallet,
    isEditing,
  ]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {backgroundColor: colors.surface, borderBottomColor: colors.borderLight, paddingHorizontal: spacing.base, paddingTop: insets.top + 12},
        ]}>
        <View style={styles.headerRow}>
          <Pressable accessibilityLabel="Cancel" accessibilityRole="button" hitSlop={12} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelBtn, {color: colors.textSecondary}]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {isEditing ? 'Edit Wallet' : 'New Wallet'}
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
          <Text numberOfLines={1} style={styles.previewName}>{name.trim() || 'Wallet Name'}</Text>
          <Text style={styles.previewCurrency}>{currency.toUpperCase() || 'USD'}</Text>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>NAME</Text>
          <View style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <TextInput
              autoFocus={!isEditing}
              maxLength={30}
              onChangeText={setName}
              placeholder="Wallet name"
              placeholderTextColor={colors.textTertiary}
              style={[styles.textInput, {color: colors.text}]}
              value={name}
            />
          </View>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>CURRENCY</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select currency"
            onPress={() => setCurrencyPickerOpen(true)}
            style={[styles.inputWrap, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md}]}>
            <Text style={[styles.currencyValue, {color: colors.text}]}>{currency.toUpperCase()}</Text>
            <AppIcon name="chevron-down" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>ICON</Text>
          <View style={styles.iconGrid}>
            {WALLET_ICONS.map((o) => {
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
            {WALLET_COLORS.map((c) => {
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
            loading={isSaving}
            onPress={handleSave}
            size="lg"
            title={isEditing ? 'Save Changes' : 'Create Wallet'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 0, paddingBottom: 12},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  cancelBtn: {fontSize: 16, fontWeight: fontWeight.medium},
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  previewCard: {alignItems: 'center', gap: 8},
  previewName: {fontSize: 22, fontWeight: fontWeight.bold, color: '#FFFFFF'},
  previewCurrency: {fontSize: 14, fontWeight: fontWeight.semibold, color: 'rgba(255,255,255,0.8)'},
  sectionTitle: {fontSize: 12, fontWeight: fontWeight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8},
  inputWrap: {flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, height: 48},
  textInput: {flex: 1, fontSize: 16, padding: 0},
  currencyValue: {flex: 1, fontSize: 16, fontWeight: fontWeight.medium},
  iconGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  iconCell: {width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2},
  colorGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  colorCell: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
  colorCheck: {color: '#FFFFFF', fontSize: 18, fontWeight: fontWeight.bold, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2},
});
