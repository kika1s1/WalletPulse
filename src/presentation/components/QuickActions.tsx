import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {AppIcon} from '@presentation/components/common/AppIcon';

export type QuickAction = {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
};

export type QuickActionsProps = {
  actions: QuickAction[];
};

const CIRCLE = 48;

function backgroundTint(hexColor: string): string {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hexColor.trim());
  if (m) {
    return `#${m[1]}26`;
  }
  return hexColor;
}

export function QuickActions({actions}: QuickActionsProps) {
  const {colors} = useTheme();

  return (
    <View
      style={styles.row}
      accessibilityRole="toolbar"
      accessibilityLabel="Quick actions"
    >
      {actions.map((action, index) => (
        <QuickActionItem
          key={`${action.label}-${index}`}
          action={action}
          textSecondaryColor={colors.textSecondary}
        />
      ))}
    </View>
  );
}

type ItemProps = {
  action: QuickAction;
  textSecondaryColor: string;
};

function QuickActionItem({action, textSecondaryColor}: ItemProps) {
  const {onPress} = action;
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <View style={styles.cell}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        style={({pressed}) => [styles.pressable, pressed && styles.pressed]}
        hitSlop={8}
      >
        <View style={[styles.circle, {backgroundColor: backgroundTint(action.color)}]}>
          <AppIcon name={action.icon} size={22} color={action.color} />
        </View>
        <Text
          style={[styles.label, {color: textSecondaryColor}]}
          numberOfLines={2}
          maxFontSizeMultiplier={1.4}
          importantForAccessibility="no"
        >
          {action.label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  pressable: {
    alignItems: 'center',
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    textAlign: 'center',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
});
