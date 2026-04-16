import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {useNotificationLogs} from '@presentation/hooks/useNotificationLogs';
import type {NotificationLog} from '@domain/entities/NotificationLog';
import {wasCreatedAsTransaction} from '@domain/entities/NotificationLog';
import {BackButton} from '@presentation/components/common';
import {AppIcon} from '@presentation/components/common/AppIcon';

const SOURCE_ICON: Record<string, string> = {
  'com.payoneer.android': 'credit-card-outline',
  'com.grey.android': 'bank-outline',
  'com.dukascopy.bank': 'bank-transfer',
};

const SOURCE_LABEL: Record<string, string> = {
  'com.payoneer.android': 'Payoneer',
  'com.grey.android': 'Grey',
  'com.dukascopy.bank': 'Dukascopy',
};

type Filter = 'all' | 'success' | 'failed';

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

function StatusBadge({
  success,
  colors,
}: {
  success: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: success ? colors.successLight : colors.dangerLight},
      ]}>
      <Text
        style={[
          styles.badgeText,
          {color: success ? colors.success : colors.danger},
        ]}>
        {success ? 'Parsed' : 'Failed'}
      </Text>
    </View>
  );
}

function LogItem({
  item,
  colors,
  radius: r,
  spacing,
}: {
  item: NotificationLog;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: ReturnType<typeof useTheme>['radius'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}) {
  const [expanded, setExpanded] = useState(false);
  const iconName = SOURCE_ICON[item.packageName] ?? 'cellphone';
  const label = SOURCE_LABEL[item.packageName] ?? item.packageName;
  const created = wasCreatedAsTransaction(item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{expanded}}
      onPress={() => setExpanded((e) => !e)}
      style={[
        styles.logCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderRadius: r.md,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
        },
      ]}>
      <View style={styles.logTop}>
        <View style={styles.logLeft}>
          <AppIcon name={iconName} size={24} color={colors.primary} />
          <View style={styles.logMeta}>
            <Text
              numberOfLines={1}
              style={[styles.logSource, {color: colors.text}]}>
              {label}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.logTime, {color: colors.textTertiary}]}>
              {formatTimestamp(item.receivedAt)}
            </Text>
          </View>
        </View>
        <View style={styles.logRight}>
          <StatusBadge success={item.parsedSuccessfully} colors={colors} />
          {created && (
            <Text style={[styles.linkedBadge, {color: colors.success}]}>
              Linked
            </Text>
          )}
        </View>
      </View>

      <Text
        numberOfLines={expanded ? undefined : 1}
        style={[styles.logTitle, {color: colors.text}]}>
        {item.title}
      </Text>
      <Text
        numberOfLines={expanded ? undefined : 2}
        style={[styles.logBody, {color: colors.textSecondary}]}>
        {item.body}
      </Text>

      {expanded && (
        <View
          style={[
            styles.logDetail,
            {
              backgroundColor: colors.background,
              borderRadius: r.sm,
              marginTop: spacing.sm,
              padding: spacing.sm,
            },
          ]}>
          <Text style={[styles.logDetailLabel, {color: colors.textTertiary}]}>
            Parse result
          </Text>
          <Text
            selectable
            style={[styles.logDetailText, {color: colors.textSecondary}]}>
            {item.parseResult}
          </Text>
          {item.transactionId ? (
            <>
              <Text
                style={[
                  styles.logDetailLabel,
                  {color: colors.textTertiary, marginTop: spacing.xs},
                ]}>
                Transaction ID
              </Text>
              <Text
                selectable
                style={[styles.logDetailText, {color: colors.primary}]}>
                {item.transactionId}
              </Text>
            </>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export default function NotificationLogScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const {logs, isLoading, error, refetch} = useNotificationLogs(100);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return logs;
    }
    if (filter === 'success') {
      return logs.filter((l) => l.parsedSuccessfully);
    }
    return logs.filter((l) => !l.parsedSuccessfully);
  }, [logs, filter]);

  const counts = useMemo(
    () => ({
      all: logs.length,
      success: logs.filter((l) => l.parsedSuccessfully).length,
      failed: logs.filter((l) => !l.parsedSuccessfully).length,
    }),
    [logs],
  );

  const renderItem = useCallback(
    ({item}: {item: NotificationLog}) => (
      <LogItem
        colors={colors}
        item={item}
        radius={radius}
        spacing={spacing}
      />
    ),
    [colors, radius, spacing],
  );

  const keyExtractor = useCallback((item: NotificationLog) => item.id, []);

  const filters: {key: Filter; label: string; count: number}[] = [
    {key: 'all', label: 'All', count: counts.all},
    {key: 'success', label: 'Parsed', count: counts.success},
    {key: 'failed', label: 'Failed', count: counts.failed},
  ];

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
            paddingTop: insets.top + 12,
          },
        ]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            Notification Log
          </Text>
          <View style={{width: 60}} />
        </View>

        <View style={[styles.filterRow, {gap: spacing.sm}]}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{selected: active}}
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.background,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: radius.full,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterLabel,
                    {color: active ? '#FFFFFF' : colors.textSecondary},
                  ]}>
                  {f.label}
                </Text>
                <Text
                  style={[
                    styles.filterCount,
                    {color: active ? '#FFFFFF' : colors.textTertiary},
                  ]}>
                  {f.count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading && logs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading notification logs...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppIcon name="alert-circle-outline" size={40} color={colors.danger} />
          <Text style={[styles.errorTitle, {color: colors.text}]}>
            Something went wrong
          </Text>
          <Text style={[styles.errorMsg, {color: colors.textSecondary}]}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={refetch}
            style={[
              styles.retryBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.sm,
              },
            ]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <AppIcon name="inbox-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, {color: colors.text}]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptyMsg, {color: colors.textSecondary}]}>
            When WalletPulse detects financial notifications,{'\n'}
            they will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            padding: spacing.base,
            gap: spacing.sm,
            paddingBottom: insets.bottom + 24,
          }}
          data={filtered}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={refetch}
              refreshing={isLoading}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  filterCount: {
    fontSize: 12,
    fontWeight: fontWeight.regular,
  },
  logCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  logEmoji: {
    fontSize: 24,
  },
  logMeta: {
    flex: 1,
    minWidth: 0,
  },
  logSource: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    lineHeight: 18,
  },
  logTime: {
    fontSize: 12,
    lineHeight: 16,
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  linkedBadge: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
  },
  logBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  logDetail: {
    gap: 2,
  },
  logDetailLabel: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logDetailText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
    marginTop: 12,
  },
  errorMsg: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
    marginTop: 12,
  },
  emptyMsg: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
});
