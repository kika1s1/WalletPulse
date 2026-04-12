import React, {forwardRef, useCallback, useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type {BottomSheetDefaultBackdropProps} from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {WinbackOffer} from '@domain/usecases/check-winback-eligibility';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Button} from './Button';

export type WinbackOfferSheetProps = {
  offer: WinbackOffer;
  transactionCountSinceLeaving?: number;
  onResubscribe: () => void;
  onDismiss: () => void;
};

export const WinbackOfferSheet = forwardRef<BottomSheet, WinbackOfferSheetProps>(
  function WinbackOfferSheet(
    {offer, transactionCountSinceLeaving = 0, onResubscribe, onDismiss},
    ref,
  ) {
    const {colors, spacing, radius, typography: typo} = useTheme();
    const snapPoints = useMemo(() => ['55%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetDefaultBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: colors.card}}
        handleIndicatorStyle={{backgroundColor: colors.border}}
      >
        <BottomSheetView style={[styles.content, {padding: spacing.base}]}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                {backgroundColor: `${colors.primary}1A`},
              ]}
            >
              <Icon name="hand-wave-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[typo.title2, {color: colors.text, textAlign: 'center'}]}>
              We miss you!
            </Text>
          </View>

          {transactionCountSinceLeaving > 0 && (
            <Text
              style={[
                typo.footnote,
                {color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs},
              ]}
            >
              Your wallet tracked {transactionCountSinceLeaving} transactions since you left.
            </Text>
          )}

          <View
            style={[
              styles.offerCard,
              {
                backgroundColor: `${colors.success}0F`,
                borderColor: `${colors.success}33`,
                borderRadius: radius.lg,
                padding: spacing.base,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[styles.discountLabel, {color: colors.success}]}>
              {offer.discountPercent}% OFF
            </Text>
            <Text style={[typo.body, {color: colors.text, textAlign: 'center'}]}>
              {offer.description}
            </Text>
            <Text style={[typo.caption, {color: colors.textTertiary, textAlign: 'center'}]}>
              for {offer.durationLabel}
            </Text>
          </View>

          <View style={[styles.features, {marginTop: spacing.md}]}>
            {['Unlimited wallets and budgets', 'Full analytics and export', 'Financial Health Score'].map(
              (feat) => (
                <View key={feat} style={styles.featureRow}>
                  <Icon name="check-circle" size={16} color={colors.success} />
                  <Text style={[typo.footnote, {color: colors.textSecondary}]}>
                    {feat}
                  </Text>
                </View>
              ),
            )}
          </View>

          <View style={{marginTop: spacing.md, gap: spacing.sm}}>
            <Button
              title="Resubscribe"
              onPress={onResubscribe}
              testID="winback-resubscribe"
            />
            <Button
              title="No thanks"
              variant="outline"
              onPress={onDismiss}
              testID="winback-dismiss"
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCard: {
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  discountLabel: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
  },
  features: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
