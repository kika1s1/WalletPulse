import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import type {ThemeId} from '@shared/theme/colors';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common/BackButton';
import {Card} from '@presentation/components/common/Card';
import {Badge} from '@presentation/components/common/Badge';
import {Button} from '@presentation/components/common/Button';
import {useEntitlement} from '@presentation/hooks/useEntitlement';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {navigateToPaywall} from '@presentation/navigation/paywall-navigation';
import {THEME_PACKS, type IAPProduct} from '@shared/constants/iap-products';
import {iapRepository} from '@data/repositories/IAPRepository';

const THEME_COLORS: Record<string, string[]> = {
  theme_midnight_oled: ['#000000', '#1A1A2E', '#16213E'],
  theme_ocean_depth: ['#0D47A1', '#1565C0', '#42A5F5'],
  theme_forest: ['#1B5E20', '#2E7D32', '#66BB6A'],
  theme_sunset: ['#E65100', '#FF6D00', '#9C27B0'],
  theme_minimal_ink: ['#212121', '#9E9E9E', '#FAFAFA'],
  theme_neon_finance: ['#0D0D0D', '#00E5FF', '#76FF03'],
  theme_all_themes: ['#6C5CE7', '#00B894', '#FDCB6E'],
};

function ColorSwatches({themeId, radius}: {themeId: string; radius: number}) {
  const swatches = THEME_COLORS[themeId] ?? ['#888', '#AAA', '#CCC'];
  return (
    <View style={sStyles.row}>
      {swatches.map((color) => (
        <View
          key={color}
          style={[
            sStyles.swatch,
            {backgroundColor: color, borderRadius: radius},
          ]}
        />
      ))}
    </View>
  );
}

export default function ThemeStoreScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {tier} = useEntitlement();
  const isPro = tier !== 'free';
  const activeThemeId = useSettingsStore(s => s.activeThemeId);
  const setActiveThemeId = useSettingsStore(s => s.setActiveThemeId);

  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    iapRepository.getPurchasedProducts().then((ids) => {
      setOwnedIds(new Set(ids));
    }).catch(() => {
      // Purchased products unavailable; treat all as unpurchased
    });
  }, []);

  const handlePurchase = useCallback(async (product: IAPProduct) => {
    setPurchasing(product.id);
    const success = await iapRepository.purchaseProduct(product.id);
    if (success) {
      setOwnedIds((prev) => new Set(prev).add(product.id));
      setActiveThemeId(product.id as ThemeId);
    }
    setPurchasing(null);
  }, [setActiveThemeId]);

  const handleApplyTheme = useCallback((themeId: string) => {
    if (themeId === 'theme_all_themes') {
      return;
    }
    setActiveThemeId(themeId as ThemeId);
  }, [setActiveThemeId]);

  const bundle = THEME_PACKS.find((p) => p.id === 'theme_all_themes')!;
  const themes = THEME_PACKS.filter((p) => p.id !== 'theme_all_themes');

  const renderTheme = useCallback(
    ({item, index}: {item: IAPProduct; index: number}) => {
      const owned = ownedIds.has(item.id);
      const canUse = owned || isPro;
      const isActive = activeThemeId === item.id;

      return (
        <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(250)}>
          <Card style={[styles.themeCard, isActive && {borderWidth: 2, borderColor: colors.primary}]}>
            <ColorSwatches themeId={item.id} radius={radius.xs} />
            <View style={styles.themeInfo}>
              <Text style={[styles.themeName, {color: colors.text}]} numberOfLines={1}>
                {item.name}
                {isActive ? ' (Active)' : ''}
              </Text>
              <Text
                style={[typo.caption, {color: colors.textSecondary}]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            </View>
            <View style={styles.themeActions}>
              {canUse ? (
                isActive ? (
                  <Badge label="Active" variant="success" />
                ) : (
                  <Button
                    title="Apply"
                    size="sm"
                    variant="outline"
                    onPress={() => handleApplyTheme(item.id)}
                    testID={`apply-${item.id}`}
                  />
                )
              ) : (
                <Button
                  title={purchasing === item.id ? '...' : item.price}
                  size="sm"
                  variant="outline"
                  onPress={() => handlePurchase(item)}
                  disabled={purchasing !== null}
                  testID={`buy-${item.id}`}
                />
              )}
            </View>
          </Card>
        </Animated.View>
      );
    },
    [ownedIds, isPro, purchasing, activeThemeId, colors, radius, typo, handlePurchase, handleApplyTheme],
  );

  const bundleOwned = ownedIds.has(bundle.id);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.base},
        ]}
      >
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[typo.headline, {color: colors.text, flex: 1, textAlign: 'center'}]}>
          Theme Store
        </Text>
        <View style={{width: 32}} />
      </View>

      <FlatList
        data={themes}
        keyExtractor={(item) => item.id}
        renderItem={renderTheme}
        contentContainerStyle={{
          padding: spacing.base,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card
              style={{
                ...styles.bundleCard,
                borderColor: colors.primary,
                marginBottom: spacing.md,
              }}
            >
              <View style={styles.bundleHeader}>
                <Icon name="palette-outline" size={28} color={colors.primary} />
                <View style={styles.bundleText}>
                  <Text style={[typo.headline, {color: colors.text}]}>
                    {bundle.name}
                  </Text>
                  <Text style={[typo.caption, {color: colors.textSecondary}]}>
                    {bundle.description}
                  </Text>
                </View>
              </View>
              <ColorSwatches themeId={bundle.id} radius={radius.xs} />
              <View style={styles.bundleFooter}>
                {bundleOwned || isPro ? (
                  <Badge
                    label={isPro ? 'Included with Pro' : 'Owned'}
                    variant={isPro ? 'info' : 'success'}
                  />
                ) : (
                  <>
                    <Text style={[styles.bundlePrice, {color: colors.primary}]}>
                      {bundle.price}
                    </Text>
                    <Text style={[typo.caption, {color: colors.success}]}>
                      Save 30%
                    </Text>
                  </>
                )}
              </View>
            </Card>
          </Animated.View>
        }
        ListFooterComponent={
          <View style={[styles.proFooter, {marginTop: spacing.lg, gap: spacing.md}]}>
            {activeThemeId !== 'default' && (
              <Button
                title="Reset to Default"
                variant="outline"
                size="sm"
                onPress={() => setActiveThemeId('default')}
              />
            )}
            {!isPro && (
              <>
                <Text style={[typo.footnote, {color: colors.textSecondary, textAlign: 'center'}]}>
                  Or upgrade to Pro for all themes and more
                </Text>
                <Button
                  title="See Pro Plans"
                  variant="primary"
                  size="sm"
                  onPress={() => navigateToPaywall('theme_store')}
                />
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const sStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  swatch: {
    width: 24,
    height: 24,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  bundleCard: {
    borderWidth: 2,
    gap: 12,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bundleText: {
    flex: 1,
    gap: 2,
  },
  bundleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bundlePrice: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  themeCard: {
    marginBottom: 8,
    gap: 8,
  },
  themeInfo: {
    gap: 2,
  },
  themeName: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  themeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  proFooter: {
    alignItems: 'center',
  },
});
