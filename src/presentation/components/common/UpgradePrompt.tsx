import React from 'react';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import Animated, {FadeInUp} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {Button} from './Button';
import {ProBadge} from './ProBadge';

export type UpgradePromptProps = {
  title: string;
  description: string;
  tier: 'pro' | 'business';
  onUpgrade: () => void;
  style?: ViewStyle;
  testID?: string;
};

export const UpgradePrompt = React.memo(function UpgradePrompt({
  title,
  description,
  tier,
  onUpgrade,
  style,
  testID,
}: UpgradePromptProps) {
  const {colors, spacing, radius, typography: typo} = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.duration(350).springify()}
      accessibilityRole="none"
      testID={testID ?? 'upgrade-prompt'}
      style={[
        styles.container,
        {
          backgroundColor: `${colors.primary}0F`,
          borderColor: `${colors.primary}33`,
          borderRadius: radius.lg,
          padding: spacing.base,
        },
        style,
      ]}>
      <View style={styles.header}>
        <Text
          style={[typo.headline, {color: colors.text, flex: 1}]}
          numberOfLines={2}>
          {title}
        </Text>
        <ProBadge tier={tier} size="small" />
      </View>

      <Text
        style={[
          typo.footnote,
          {color: colors.textSecondary, marginTop: spacing.xs},
        ]}
        numberOfLines={3}>
        {description}
      </Text>

      <View style={{marginTop: spacing.md, alignSelf: 'flex-start'}}>
        <Button
          title="See Plans"
          onPress={onUpgrade}
          variant="primary"
          size="sm"
          testID="upgrade-prompt-cta"
        />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
