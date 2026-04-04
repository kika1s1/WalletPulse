import React from 'react';
import {ScrollView, StyleSheet, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';

type Props = {
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function ScreenContainer({
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  if (!scrollable) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top}]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={[styles.content, {paddingTop: insets.top}]}
      showsVerticalScrollIndicator={false}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
});
