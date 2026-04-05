import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Button} from '@presentation/components/common/Button';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeCreateCategory} from '@domain/usecases/create-category';
import {makeUpdateCategory} from '@domain/usecases/update-category';
import {generateId} from '@shared/utils/hash';
import type {CategoryKind, Category} from '@domain/entities/Category';
import {AppIcon} from '@presentation/components/common/AppIcon';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CreateCategory'>;
type Route = RouteProp<SettingsStackParamList, 'CreateCategory'>;

const ICON_OPTIONS: {key: string; mdi: string}[] = [
  {key: 'fork-knife', mdi: 'silverware-fork-knife'},
  {key: 'shopping-cart', mdi: 'cart-outline'},
  {key: 'car', mdi: 'car-outline'},
  {key: 'bag', mdi: 'shopping-outline'},
  {key: 'film', mdi: 'movie-open-outline'},
  {key: 'heart-pulse', mdi: 'medical-bag'},
  {key: 'home', mdi: 'home-outline'},
  {key: 'lightbulb', mdi: 'lightbulb-outline'},
  {key: 'briefcase', mdi: 'briefcase-outline'},
  {key: 'airplane', mdi: 'airplane'},
  {key: 'graduation-cap', mdi: 'school-outline'},
  {key: 'sparkles', mdi: 'auto-fix'},
  {key: 'gift', mdi: 'gift-outline'},
  {key: 'shield-check', mdi: 'shield-check-outline'},
  {key: 'receipt', mdi: 'receipt'},
  {key: 'banknotes', mdi: 'cash'},
  {key: 'laptop', mdi: 'laptop'},
  {key: 'trending-up', mdi: 'trending-up'},
  {key: 'refresh', mdi: 'swap-horizontal'},
  {key: 'coffee', mdi: 'coffee-outline'},
  {key: 'star', mdi: 'star-outline'},
  {key: 'music', mdi: 'music-note'},
  {key: 'camera', mdi: 'camera-outline'},
  {key: 'book', mdi: 'book-open-outline'},
  {key: 'tool', mdi: 'wrench-outline'},
  {key: 'globe', mdi: 'earth'},
  {key: 'game', mdi: 'gamepad-variant-outline'},
  {key: 'pet', mdi: 'paw'},
  {key: 'flower', mdi: 'flower-outline'},
  {key: 'sport', mdi: 'soccer'},
];

const COLOR_PALETTE = [
  '#FF6B6B', '#E17055', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#6C5CE7', '#FD79A8',
  '#74B9FF', '#FDA7DF', '#FF9FF3', '#55EFC4', '#636E72',
  '#00B894', '#0984E3', '#E056A0', '#B2BEC3', '#F39C12',
  '#E74C3C', '#2ECC71', '#3498DB', '#9B59B6',
];

const TYPE_OPTIONS: {key: CategoryKind; label: string}[] = [
  {key: 'expense', label: 'Expense'},
  {key: 'income', label: 'Income'},
  {key: 'both', label: 'Both'},
];

export default function CreateCategoryScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.editCategoryId;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('star');
  const [color, setColor] = useState('#6C5CE7');
  const [type, setType] = useState<CategoryKind>('expense');
  const [isSaving, setIsSaving] = useState(false);
  const [existing, setExisting] = useState<Category | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!editId) {
      return;
    }
    (async () => {
      const ds = getLocalDataSource();
      const cat = await ds.categories.findById(editId);
      if (cat && mountedRef.current) {
        setExisting(cat);
        setName(cat.name);
        setIcon(cat.icon);
        setColor(cat.color);
        setType(cat.type);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [editId]);

  const isEditing = existing !== null;
  const canSave = name.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) {
      return;
    }
    setIsSaving(true);

    try {
      const ds = getLocalDataSource();
      const now = Date.now();

      if (isEditing && existing) {
        const update = makeUpdateCategory({categoryRepo: ds.categories});
        await update({
          ...existing,
          name: name.trim(),
          icon,
          color,
          type,
          updatedAt: now,
        });
      } else {
        const create = makeCreateCategory({categoryRepo: ds.categories});
        const allCats = await ds.categories.findAll();
        await create({
          id: generateId(),
          name: name.trim(),
          icon,
          color,
          type,
          isDefault: false,
          isArchived: false,
          sortOrder: allCats.length,
          createdAt: now,
          updatedAt: now,
        });
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert(
        isEditing ? 'Update failed' : 'Create failed',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setIsSaving(false);
    }
  }, [canSave, color, existing, icon, isEditing, isSaving, name, navigation, type]);

  const selectedMdi =
    ICON_OPTIONS.find((o) => o.key === icon)?.mdi ?? 'star-outline';

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
          },
        ]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelBtn, {color: colors.textSecondary}]}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            {isEditing ? 'Edit Category' : 'New Category'}
          </Text>
          <View style={{width: 60}} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{padding: spacing.base, paddingBottom: spacing['4xl']}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
              borderRadius: radius.lg,
              padding: spacing.lg,
            },
            shadows.sm,
          ]}>
          <View style={[styles.previewIcon, {backgroundColor: `${color}22`}]}>
            <AppIcon name={selectedMdi} size={28} color={color} />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.previewName,
              {color: name.trim() ? colors.text : colors.textTertiary},
            ]}>
            {name.trim() || 'Category Name'}
          </Text>
          <View style={[styles.previewBadge, {backgroundColor: `${color}22`}]}>
            <Text style={[styles.previewBadgeText, {color}]}>
              {type}
            </Text>
          </View>
        </View>

        <View style={[styles.section, {marginTop: spacing.xl}]}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>
            NAME
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                borderRadius: radius.md,
              },
            ]}>
            <TextInput
              autoFocus={!isEditing}
              maxLength={30}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor={colors.textTertiary}
              style={[styles.textInput, {color: colors.text}]}
              value={name}
            />
            <Text style={[styles.charCount, {color: colors.textTertiary}]}>
              {name.length}/30
            </Text>
          </View>
        </View>

        <View style={[styles.section, {marginTop: spacing.xl}]}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>
            TYPE
          </Text>
          <View style={[styles.typeRow, {gap: spacing.sm}]}>
            {TYPE_OPTIONS.map((t) => {
              const active = type === t.key;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{selected: active}}
                  key={t.key}
                  onPress={() => setType(t.key)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.borderLight,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.typeLabel,
                      {color: active ? '#FFFFFF' : colors.textSecondary},
                    ]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, {marginTop: spacing.xl}]}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>
            ICON
          </Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((o) => {
              const active = icon === o.key;
              return (
                <Pressable
                  accessibilityLabel={o.key}
                  accessibilityRole="radio"
                  accessibilityState={{selected: active}}
                  key={o.key}
                  onPress={() => setIcon(o.key)}
                  style={[
                    styles.iconCell,
                    {
                      backgroundColor: active
                        ? `${color}22`
                        : colors.card,
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

        <View style={[styles.section, {marginTop: spacing.xl}]}>
          <Text style={[styles.sectionTitle, {color: colors.textTertiary}]}>
            COLOR
          </Text>
          <View style={styles.colorGrid}>
            {COLOR_PALETTE.map((c) => {
              const active = color === c;
              return (
                <Pressable
                  accessibilityLabel={c}
                  accessibilityRole="radio"
                  accessibilityState={{selected: active}}
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorCell,
                    {
                      backgroundColor: c,
                      borderColor: active ? colors.text : 'transparent',
                      borderWidth: active ? 3 : 0,
                    },
                  ]}>
                  {active && (
                    <Text style={styles.colorCheck}>✓</Text>
                  )}
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
            title={isEditing ? 'Save Changes' : 'Create Category'}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelBtn: {fontSize: 16, fontWeight: fontWeight.medium},
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  previewCard: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  previewIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {fontSize: 28},
  previewName: {fontSize: 20, fontWeight: fontWeight.bold},
  previewBadge: {paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12},
  previewBadgeText: {fontSize: 12, fontWeight: fontWeight.semibold, textTransform: 'capitalize'},
  section: {},
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {flex: 1, fontSize: 16, padding: 0},
  charCount: {fontSize: 12, marginLeft: 8},
  typeRow: {flexDirection: 'row'},
  typeChip: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  typeLabel: {fontSize: 14, fontWeight: fontWeight.medium},
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  iconEmoji: {fontSize: 22},
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: fontWeight.bold,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
});
