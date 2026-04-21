import React, {useEffect} from 'react';
import {StyleSheet, Text, TextInput, View, type KeyboardTypeOptions} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

export type InputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  editable?: boolean;
  testID?: string;
};

const FOCUS_TIMING_MS = 180;

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  leftIcon,
  rightIcon,
  multiline = false,
  numberOfLines,
  maxLength,
  keyboardType = 'default',
  secureTextEntry = false,
  editable = true,
  testID,
}: InputProps) {
  const {colors, radius} = useTheme();
  const focused = useSharedValue(0);
  const errorActive = useSharedValue(error ? 1 : 0);

  useEffect(() => {
    errorActive.value = error ? 1 : 0;
  }, [error, errorActive]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const hasError = errorActive.value > 0.5;
    const isFocused = focused.value > 0.5;
    const borderW = isFocused ? 2 : 1;

    if (hasError) {
      return {
        borderWidth: borderW,
        borderColor: colors.danger,
      };
    }

    return {
      borderWidth: borderW,
      borderColor: interpolateColor(focused.value, [0, 1], [colors.border, colors.primary]),
    };
  });

  const handleFocus = () => {
    focused.value = withTiming(1, {duration: FOCUS_TIMING_MS});
  };

  const handleBlur = () => {
    focused.value = withTiming(0, {duration: FOCUS_TIMING_MS});
  };

  const horizontalPad = 16;
  const iconSlot = 24;
  const iconInset = 12;
  const paddingLeft = leftIcon ? horizontalPad + iconSlot : horizontalPad;
  const paddingRight = rightIcon ? horizontalPad + iconSlot : horizontalPad;

  const showHelper = !error && helperText;

  return (
    <View accessibilityRole="none" style={styles.root} testID={testID}>
      {label ? (
        <Text accessibilityRole="text" style={[styles.label, {color: colors.textSecondary}]}>
          {label}
        </Text>
      ) : null}

      <Animated.View style={[styles.fieldShell, {borderRadius: radius.md}, animatedContainerStyle]}>
        {leftIcon ? (
          <View
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[styles.iconLeft, {left: iconInset}]}>
            {leftIcon}
          </View>
        ) : null}

        <TextInput
          accessibilityHint={!error && helperText ? helperText : undefined}
          accessibilityLabel={label ?? placeholder ?? 'Text field'}
          accessibilityState={{disabled: !editable}}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onBlur={handleBlur}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            multiline ? styles.inputMultiline : styles.inputSingleLine,
            {color: colors.text, paddingLeft, paddingRight},
          ]}
          testID={testID ? `${testID}-input` : undefined}
          value={value}
        />

        {rightIcon ? (
          <View
            importantForAccessibility="no-hide-descendants"
            pointerEvents="box-none"
            style={[styles.iconRight, {right: iconInset}]}>
            {rightIcon}
          </View>
        ) : null}
      </Animated.View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.message, {color: colors.danger}]}>
          {error}
        </Text>
      ) : null}

      {showHelper ? (
        <Text style={[styles.message, {color: colors.textTertiary}]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  fieldShell: {
    justifyContent: 'center',
    position: 'relative',
  },
  input: {
    fontSize: 15,
  },
  inputSingleLine: {
    height: 48,
    minHeight: 48,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  inputMultiline: {
    minHeight: 96,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  iconLeft: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 24,
    zIndex: 1,
  },
  iconRight: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 24,
    zIndex: 1,
  },
  message: {
    fontSize: 12,
  },
});
