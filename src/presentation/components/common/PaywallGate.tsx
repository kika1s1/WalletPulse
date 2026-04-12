import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {FeatureLimits} from '@domain/entities/Entitlement';
import {useTheme} from '@shared/theme';
import {Card} from './Card';
import {Button} from './Button';
import {useFeatureGate} from '@presentation/hooks/useFeatureGate';

export type PaywallGateProps = {
  feature: keyof FeatureLimits;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureLabel?: string;
  testID?: string;
};

export const PaywallGate = React.memo(function PaywallGate({
  feature,
  children,
  fallback,
  featureLabel,
  testID,
}: PaywallGateProps) {
  const {available, showPaywall} = useFeatureGate(feature);

  if (available) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <DefaultLockedFallback
      featureLabel={featureLabel ?? String(feature)}
      onUpgrade={showPaywall}
      testID={testID}
    />
  );
});

type DefaultLockedFallbackProps = {
  featureLabel: string;
  onUpgrade: () => void;
  testID?: string;
};

function DefaultLockedFallback({
  featureLabel,
  onUpgrade,
  testID,
}: DefaultLockedFallbackProps) {
  const {colors, spacing, typography: typo} = useTheme();

  return (
    <Card style={styles.card} testID={testID ?? 'paywall-gate-locked'}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            {backgroundColor: `${colors.primary}1A`},
          ]}>
          <Icon name="lock-outline" size={28} color={colors.primary} />
        </View>
        <Text
          style={[
            typo.headline,
            {color: colors.text, marginTop: spacing.sm, textAlign: 'center'},
          ]}>
          {featureLabel}
        </Text>
        <Text
          style={[
            typo.footnote,
            {
              color: colors.textSecondary,
              marginTop: spacing.xs,
              textAlign: 'center',
            },
          ]}>
          Upgrade to Pro to unlock this feature
        </Text>
        <View style={{marginTop: spacing.md}}>
          <Button
            title="Upgrade"
            onPress={onUpgrade}
            size="sm"
            testID="paywall-gate-upgrade-btn"
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
