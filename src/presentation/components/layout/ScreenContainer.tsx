import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';

type Props = {
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Skip the built-in paddingTop (for screens with custom headers) */
  noTopInset?: boolean;
  /** Enable KeyboardAvoidingView wrapper for form screens */
  avoidKeyboard?: boolean;
};

const TAB_BAR_CLEARANCE = 16;

export function ScreenContainer({
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
  noTopInset = false,
  avoidKeyboard = false,
}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = noTopInset ? 0 : insets.top;
  const bottomPad = Math.max(insets.bottom, TAB_BAR_CLEARANCE) + 24;

  const inner = !scrollable ? (
    <View style={[styles.container, {backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad}]}>
      {children}
    </View>
  ) : (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={[styles.content, {paddingTop: topPad, paddingBottom: bottomPad}]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  );

  if (avoidKeyboard) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {inner}
      </KeyboardAvoidingView>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
