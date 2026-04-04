import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  placeholder?: string;
  label?: string;
  testID?: string;
};

const MAX_NOTES = 500;
const FOCUS_DURATION = 180;

export function NotesEditor({
  value,
  onChangeText,
  maxLength = MAX_NOTES,
  placeholder = 'Add notes, links, or context...',
  label = 'Notes',
  testID,
}: Props) {
  const {colors, radius} = useTheme();
  const focused = useSharedValue(0);
  const [expanded, setExpanded] = useState(false);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focused.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
    borderWidth: focused.value > 0.5 ? 2 : 1,
  }));

  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= 50;
  const isOverLimit = remaining < 0;

  const handleFocus = useCallback(() => {
    focused.value = withTiming(1, {duration: FOCUS_DURATION});
    setExpanded(true);
  }, [focused]);

  const handleBlur = useCallback(() => {
    focused.value = withTiming(0, {duration: FOCUS_DURATION});
    if (!value.trim()) {
      setExpanded(false);
    }
  }, [focused, value]);

  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, {color: colors.textSecondary}]}>{label}</Text>
        {value.length > 0 && (
          <Pressable accessibilityRole="button" onPress={handleClear} hitSlop={8}>
            <Text style={[styles.clearBtn, {color: colors.textTertiary}]}>Clear</Text>
          </Pressable>
        )}
      </View>

      <Animated.View
        style={[
          styles.fieldWrap,
          {borderRadius: radius.md, backgroundColor: colors.surfaceElevated},
          borderStyle,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {color: colors.text},
            expanded ? styles.inputExpanded : styles.inputCollapsed,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
          scrollEnabled
        />
      </Animated.View>

      <View style={styles.footerRow}>
        {value.length > 0 && (
          <Text style={[styles.wordCount, {color: colors.textTertiary}]}>
            {value.split(/\s+/).filter(Boolean).length} words
          </Text>
        )}
        <View style={{flex: 1}} />
        <Text
          style={[
            styles.charCount,
            {
              color: isOverLimit
                ? colors.danger
                : isNearLimit
                  ? colors.warning
                  : colors.textTertiary,
            },
          ]}
        >
          {remaining}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  clearBtn: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  fieldWrap: {
    justifyContent: 'flex-start',
  },
  input: {
    fontSize: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputCollapsed: {
    minHeight: 48,
    maxHeight: 48,
  },
  inputExpanded: {
    minHeight: 100,
    maxHeight: 180,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 11,
  },
  charCount: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
});
