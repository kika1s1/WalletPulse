import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

const MAX_DIGIT_LEN = 14;
const AMOUNT_FONT_SIZE = 40;

export type AmountInputProps = {
  value: number;
  onChangeValue: (cents: number) => void;
  currency: string;
  currencySymbol?: string;
  onCurrencyPress?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  testID?: string;
};

function formatIntegerWithCommas(n: number): string {
  return Math.floor(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function centsToParts(cents: number): {major: number; minor: number} {
  const abs = Math.abs(cents);
  return {major: Math.floor(abs / 100), minor: abs % 100};
}

function digitsToCents(digits: string): number {
  if (!digits) {
    return 0;
  }
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

function valuePropToDigits(value: number): string {
  return value === 0 ? '' : String(value);
}

export function AmountInput({
  value,
  onChangeValue,
  currency,
  currencySymbol,
  onCurrencyPress,
  placeholder = '0.00',
  autoFocus = false,
  testID,
}: AmountInputProps) {
  const {colors, radius, spacing} = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [digits, setDigits] = useState(() => valuePropToDigits(value));
  const scale = useSharedValue(1);
  const prevDigitsRef = useRef(digits);

  useEffect(() => {
    setDigits(valuePropToDigits(value));
  }, [value]);

  useEffect(() => {
    if (prevDigitsRef.current !== digits) {
      prevDigitsRef.current = digits;
      scale.value = withSequence(
        withTiming(1.03, {duration: 90}),
        withTiming(1, {duration: 140}),
      );
    }
  }, [digits, scale]);

  const commitDigits = useCallback(
    (nextRaw: string) => {
      const sanitized = nextRaw.replace(/\D/g, '').slice(0, MAX_DIGIT_LEN);
      setDigits(sanitized);
      onChangeValue(digitsToCents(sanitized));
    },
    [onChangeValue],
  );

  const cents = digitsToCents(digits);
  const {major, minor} = centsToParts(cents);
  const minorStr = minor.toString().padStart(2, '0');
  const intDisplay = formatIntegerWithCommas(major);
  const decimalMuted = minor === 0 && digits.length > 0;

  const animatedAmountStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const chipLabel = currencySymbol ?? currency;

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        accessibilityLabel="Select currency"
        accessibilityRole="button"
        disabled={!onCurrencyPress}
        onPress={onCurrencyPress}
        style={({pressed}) => [
          styles.chip,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            marginRight: spacing.sm,
            opacity: onCurrencyPress ? (pressed ? 0.85 : 1) : 1,
          },
        ]}
        testID={testID ? `${testID}-currency` : undefined}>
        <Text style={[styles.chipText, {color: colors.text}]} numberOfLines={1}>
          {chipLabel}
        </Text>
        <Text style={[styles.chipCode, {color: colors.textSecondary}]}>{currency}</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Amount"
        accessibilityRole="none"
        onPress={focusInput}
        style={styles.amountTouch}
        testID={testID ? `${testID}-amount-hit` : undefined}>
        <View style={styles.amountInner}>
          <TextInput
            ref={inputRef}
            autoFocus={autoFocus}
            caretHidden
            contextMenuHidden
            cursorColor="transparent"
            keyboardType="number-pad"
            maxLength={MAX_DIGIT_LEN}
            onChangeText={commitDigits}
            selectionColor="transparent"
            style={styles.hiddenInput}
            testID={testID ? `${testID}-input` : undefined}
            value={digits}
            underlineColorAndroid="transparent"
          />
          <Animated.View style={[styles.amountDisplayWrap, animatedAmountStyle]}>
            {digits.length === 0 ? (
              <Text style={[styles.amountText, {color: colors.textTertiary}]}>{placeholder}</Text>
            ) : (
              <Text style={styles.amountText}>
                <Text style={{color: colors.text}}>{intDisplay}</Text>
                <Text style={{color: decimalMuted ? colors.textTertiary : colors.text}}>
                  .{minorStr}
                </Text>
              </Text>
            )}
          </Animated.View>
        </View>
      </Pressable>



    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 96,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 18,
    fontWeight: '700',
  },
  chipCode: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  amountTouch: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  amountInner: {
    justifyContent: 'center',
    minHeight: 56,
    position: 'relative',
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    fontSize: 1,
    height: 1,
    opacity: 0,
    width: '100%',
    zIndex: 2,
  },
  amountDisplayWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: 4,
    zIndex: 1,
  },
  amountText: {
    fontSize: AMOUNT_FONT_SIZE,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'right',
  },
});
