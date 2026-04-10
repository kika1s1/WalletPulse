import React, {useCallback} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {RectButton, Swipeable} from 'react-native-gesture-handler';
import {useTheme} from '@shared/theme';

const ACTION_WIDTH = 72;

export type SwipeAction = {
  label: string;
  color: string;
  icon?: React.ReactNode;
  onPress: () => void;
};

export type SwipeableRowProps = {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  testID?: string;
};

function ActionButton({
  action,
  onInvoked,
}: {
  action: SwipeAction;
  onInvoked: () => void;
}) {
  const {typography} = useTheme();

  const handlePress = useCallback(() => {
    action.onPress();
    onInvoked();
  }, [action, onInvoked]);

  return (
    <RectButton
      accessibilityLabel={action.label}
      onPress={handlePress}
      style={[styles.action, {backgroundColor: action.color}]}>
      <View style={styles.actionInner}>
        {action.icon ? <View style={styles.iconSlot}>{action.icon}</View> : null}
        <Text
          numberOfLines={2}
          style={[
            styles.actionLabel,
            {
              fontSize: typography.caption.fontSize,
              fontWeight: typography.caption.fontWeight,
              lineHeight: typography.caption.lineHeight,
            },
          ]}>
          {action.label}
        </Text>
      </View>
    </RectButton>
  );
}

type SwipeableInstance = InstanceType<typeof Swipeable>;
type SwipeAnimatedInterpolation = ReturnType<Animated.Value['interpolate']>;

function renderActionPanel(
  actions: SwipeAction[] | undefined,
  swipeable: SwipeableInstance,
): React.ReactNode {
  if (!actions?.length) {
    return null;
  }

  const ordered = [...actions].reverse();

  return (
    <View style={styles.actionsRow}>
      {ordered.map((action, index) => (
        <ActionButton
          key={`${action.label}-${index}`}
          action={action}
          onInvoked={() => swipeable.close()}
        />
      ))}
    </View>
  );
}

export function SwipeableRow({
  children,
  leftActions,
  rightActions,
  testID,
}: SwipeableRowProps) {
  const {colors} = useTheme();

  const renderLeftActions = useCallback(
    (_progress: SwipeAnimatedInterpolation, _drag: SwipeAnimatedInterpolation, swipeable: SwipeableInstance) =>
      renderActionPanel(leftActions, swipeable),
    [leftActions],
  );

  const renderRightActions = useCallback(
    (_progress: SwipeAnimatedInterpolation, _drag: SwipeAnimatedInterpolation, swipeable: SwipeableInstance) =>
      renderActionPanel(rightActions, swipeable),
    [rightActions],
  );

  return (
    <Swipeable
      enableTrackpadTwoFingerGesture
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={leftActions?.length ? renderLeftActions : undefined}
      renderRightActions={rightActions?.length ? renderRightActions : undefined}
      containerStyle={{backgroundColor: colors.surface}}
      childrenContainerStyle={styles.childrenContainer}
      testID={testID}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  childrenContainer: {
    backgroundColor: 'transparent',
  },
  actionsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  action: {
    width: ACTION_WIDTH,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    textAlign: 'center',
    color: '#FFFFFF',
  },
});
