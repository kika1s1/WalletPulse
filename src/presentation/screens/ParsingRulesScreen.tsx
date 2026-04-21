import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common';
import {ScreenContainer} from '@presentation/components/layout';
import {EmptyState, ErrorState} from '@presentation/components/feedback';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useParsingRules} from '@presentation/hooks/useParsingRules';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import type {ParsingRule} from '@domain/entities/ParsingRule';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'ParsingRules'>;

const PATTERN_PREVIEW_LEN = 44;

function truncatePattern(pattern: string): string {
  const t = pattern.trim();
  if (t.length <= PATTERN_PREVIEW_LEN) {
    return t;
  }
  return `${t.slice(0, PATTERN_PREVIEW_LEN)}…`;
}

function ItemSeparator() {
  return <View style={separatorStyles.gap} />;
}

const separatorStyles = StyleSheet.create({
  gap: {height: 12},
});

export default function ParsingRulesScreen() {
  const navigation = useNavigation<Nav>();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const {rules, isLoading, error, toggleRule, refetch} = useParsingRules();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const sortedRules = useMemo(
    () =>
      [...rules].sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.ruleName.localeCompare(b.ruleName);
      }),
    [rules],
  );

  const renderItem = useCallback(
    ({item}: {item: ParsingRule}) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit rule ${item.ruleName}`}
        onPress={() => navigation.navigate('CreateParsingRule', {ruleId: item.id})}
        style={({pressed}) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            borderRadius: radius.md,
            opacity: pressed ? 0.92 : 1,
            padding: spacing.base,
          },
          shadows.sm,
        ]}>
        <View style={styles.cardMain}>
          <Text style={[styles.ruleName, {color: colors.text}]} numberOfLines={1}>
            {item.ruleName}
          </Text>
          <Text style={[styles.meta, {color: colors.textSecondary}]} numberOfLines={1}>
            {item.sourceApp}
          </Text>
          <Text style={[styles.package, {color: colors.textTertiary}]} numberOfLines={1}>
            {item.packageName}
          </Text>
          <Text
            style={[styles.pattern, {color: colors.textTertiary}]}
            numberOfLines={2}
            selectable>
            {truncatePattern(item.pattern)}
          </Text>
        </View>
        <Switch
          accessibilityLabel={`Rule ${item.ruleName} active`}
          onValueChange={(v) => toggleRule(item.id, v)}
          thumbColor={item.isActive ? colors.primary : colors.border}
          trackColor={{false: colors.borderLight, true: colors.primaryLight}}
          value={item.isActive}
        />
      </Pressable>
    ),
    [colors, navigation, radius, shadows, spacing.base, toggleRule],
  );

  const keyExtractor = useCallback((item: ParsingRule) => item.id, []);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false} noTopInset>
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: spacing.base,
              paddingTop: insets.top + spacing.sm,
              borderBottomColor: colors.borderLight,
            },
          ]}>
          <BackButton />
          <Text style={[typography.title3, styles.headerTitle, {color: colors.text}]}>
            Parsing Rules
          </Text>
          <Pressable
            accessibilityLabel="Add parsing rule"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigation.navigate('CreateParsingRule')}
            style={styles.addBtn}>
            <AppIcon name="plus" size={26} color={colors.primary} />
          </Pressable>
        </View>

        {isLoading && rules.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
              Loading rules…
            </Text>
          </View>
        ) : error && rules.length === 0 ? (
          <View style={[styles.errorWrap, {paddingHorizontal: spacing.base}]}>
            <ErrorState message={error} onRetry={refetch} />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{
              padding: spacing.base,
              paddingBottom: insets.bottom + 24,
              flexGrow: 1,
            }}
            data={sortedRules}
            keyExtractor={keyExtractor}
            ListEmptyComponent={
              <EmptyState
                title="No custom rules"
                message="Add a rule to parse notifications from apps that are not built in. Use named regex groups: amount, currency, merchant, description."
              />
            }
            onRefresh={refetch}
            refreshing={isLoading && rules.length > 0}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={ItemSeparator}
          />
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 8,
    textAlign: 'center',
  },
  addBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  card: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
  },
  cardMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  meta: {
    fontSize: 13,
  },
  package: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  pattern: {
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 4,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
});
