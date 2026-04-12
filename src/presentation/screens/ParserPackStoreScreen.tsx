import React, {useCallback, useEffect, useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common/BackButton';
import {Card} from '@presentation/components/common/Card';
import {Badge} from '@presentation/components/common/Badge';
import {Button} from '@presentation/components/common/Button';
import {useEntitlement} from '@presentation/hooks/useEntitlement';
import {navigateToPaywall} from '@presentation/navigation/paywall-navigation';
import {PARSER_PACKS, type IAPProduct} from '@shared/constants/iap-products';
import {iapRepository} from '@data/repositories/IAPRepository';

const REGION_ICONS: Record<string, string> = {
  parser_international: 'earth',
  parser_african: 'map-marker',
  parser_european: 'map-marker',
  parser_middleeast: 'map-marker',
  parser_asian: 'map-marker',
  parser_latam: 'map-marker',
  parser_us: 'flag-outline',
  parser_crypto: 'bitcoin',
  parser_allbanks: 'bank',
};

export default function ParserPackStoreScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {tier} = useEntitlement();
  const isPro = tier !== 'free';

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
    }
    setPurchasing(null);
  }, []);

  const bundle = PARSER_PACKS.find((p) => p.id === 'parser_allbanks')!;
  const packs = PARSER_PACKS.filter((p) => p.id !== 'parser_allbanks');

  const renderPack = useCallback(
    ({item, index}: {item: IAPProduct; index: number}) => {
      const owned = ownedIds.has(item.id);
      const icon = REGION_ICONS[item.id] ?? 'package-variant';

      return (
        <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(250)}>
          <Card style={styles.packCard}>
            <View style={styles.packRow}>
              <View
                style={[
                  styles.packIcon,
                  {backgroundColor: `${colors.primary}14`, borderRadius: radius.sm},
                ]}
              >
                <Icon name={icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.packInfo}>
                <Text style={[styles.packName, {color: colors.text}]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text
                  style={[typo.caption, {color: colors.textSecondary}]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              </View>
              {owned ? (
                <Badge label="Owned" variant="success" />
              ) : isPro ? (
                <Badge label="Included" variant="info" />
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
    [ownedIds, isPro, purchasing, colors, radius, typo, handlePurchase],
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
          Parser Packs
        </Text>
        <View style={{width: 32}} />
      </View>

      <FlatList
        data={packs}
        keyExtractor={(item) => item.id}
        renderItem={renderPack}
        contentContainerStyle={{
          padding: spacing.base,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(300)}>
            <Pressable
              accessibilityRole="button"
              disabled={bundleOwned || isPro || purchasing !== null}
              onPress={() => handlePurchase(bundle)}
              style={[
                styles.bundleCard,
                {
                  backgroundColor: `${colors.primary}0F`,
                  borderColor: colors.primary,
                  borderRadius: radius.lg,
                  padding: spacing.base,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <View style={styles.bundleHeader}>
                <Icon name="bank" size={28} color={colors.primary} />
                <View style={styles.bundleText}>
                  <Text style={[typo.headline, {color: colors.text}]}>
                    {bundle.name}
                  </Text>
                  <Text style={[typo.caption, {color: colors.textSecondary}]}>
                    {bundle.description}
                  </Text>
                </View>
              </View>
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
                      Save 60%
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          </Animated.View>
        }
        ListFooterComponent={
          !isPro ? (
            <View style={[styles.proFooter, {marginTop: spacing.lg}]}>
              <Text style={[typo.footnote, {color: colors.textSecondary, textAlign: 'center'}]}>
                Or upgrade to Pro for all parsers and more
              </Text>
              <View style={{marginTop: spacing.sm, alignSelf: 'center'}}>
                <Button
                  title="See Pro Plans"
                  variant="primary"
                  size="sm"
                  onPress={() => navigateToPaywall('parser_store')}
                />
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}

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
  packCard: {
    marginBottom: 8,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packInfo: {
    flex: 1,
    gap: 2,
  },
  packName: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  proFooter: {
    alignItems: 'center',
  },
});
