import React, {useCallback, useMemo} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {Button, Card} from '@presentation/components/common';
import {ScreenContainer} from '@presentation/components/layout';
import {formatAmount} from '@shared/utils/format-currency';
import type {TabParamList, HomeStackParamList} from '@presentation/navigation/types';
import type {RouteProp} from '@react-navigation/native';
import type {Category} from '@domain/entities/Category';
import {useTransactionById} from '@presentation/hooks/useTransactions';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import {useCategories} from '@presentation/hooks/useCategories';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';

type DetailNav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'TransactionDetail'>,
  BottomTabNavigationProp<TabParamList>
>;

type DetailRoute = RouteProp<HomeStackParamList, 'TransactionDetail'>;

function categoryDisplayFromCategories(
  categoryId: string,
  categories: Category[],
): {name: string; icon: string; color: string} {
  const found = categories.find((c) => c.id === categoryId);
  if (found) {
    return {name: found.name, icon: found.icon, color: found.color};
  }
  return {name: 'Other', icon: '•', color: '#B2BEC3'};
}

function formatSourceLabel(source: string): string {
  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWhen(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(ts);
}

function signedAmountParts(
  type: 'income' | 'expense' | 'transfer',
  amountCents: number,
  currency: string,
): {sign: string; body: string; colorKey: 'income' | 'expense' | 'transfer'} {
  const abs = Math.abs(amountCents);
  const core = formatAmount(abs, currency).replace(/^[+-]/u, '').trim();
  if (type === 'income') {
    return {sign: '+', body: core, colorKey: 'income'};
  }
  if (type === 'expense') {
    return {sign: '-', body: core, colorKey: 'expense'};
  }
  const sign = amountCents < 0 ? '-' : amountCents > 0 ? '+' : '';
  return {sign, body: core, colorKey: 'transfer'};
}

type RowProps = {label: string; value: string};

function DetailRow({label, value}: RowProps) {
  const {colors, typography} = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[typography.footnote, {color: colors.textSecondary, flex: 1}]}>{label}</Text>
      <Text style={[typography.body, {color: colors.text, flex: 1.4, fontWeight: '500', textAlign: 'right'}]}>
        {value}
      </Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const navigation = useNavigation<DetailNav>();
  const route = useRoute<DetailRoute>();
  const {colors, spacing, typography} = useTheme();
  const insets = useSafeAreaInsets();
  const transactionId = route.params.transactionId;

  const {transaction, isLoading, error} = useTransactionById(transactionId);
  const {categories} = useCategories();
  const {deleteTransaction} = useTransactionActions();

  const category = useMemo(() => {
    if (!transaction) {
      return null;
    }
    return categoryDisplayFromCategories(transaction.categoryId, categories);
  }, [transaction, categories]);

  const amountDisplay = useMemo(() => {
    if (!transaction) {
      return null;
    }
    return signedAmountParts(transaction.type, transaction.amount, transaction.currency);
  }, [transaction]);

  const amountColor = amountDisplay
    ? colors[amountDisplay.colorKey]
    : colors.text;

  const handleEdit = useCallback(() => {
    if (!transaction) {
      return;
    }
    navigation.navigate('TransactionsTab', {
      screen: 'EditTransaction',
      params: {transactionId: transaction.id},
    });
  }, [navigation, transaction]);

  const handleDelete = useCallback(() => {
    if (!transaction) {
      return;
    }
    Alert.alert('Delete transaction', 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteTransaction(transaction.id);
              navigation.goBack();
            } catch {
              Alert.alert('Delete failed', 'Could not remove this transaction. Try again.');
            }
          })();
        },
      },
    ]);
  }, [navigation, transaction, deleteTransaction]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.missing, {paddingHorizontal: spacing.base, paddingTop: spacing.xl, alignItems: 'center'}]}>
          <ActivityIndicator accessibilityLabel="Loading transaction" color={colors.primary} size="large" />
          <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.md}]}>Loading…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={[styles.missing, {paddingHorizontal: spacing.base, paddingTop: spacing.xl}]}>
          <Text style={[typography.title3, {color: colors.text}]}>Something went wrong</Text>
          <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.sm}]}>{error}</Text>
          <View style={{marginTop: spacing.lg}}>
            <Button onPress={() => navigation.goBack()} title="Go back" />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (!transaction || !amountDisplay || !category) {
    return (
      <ScreenContainer>
        <View style={[styles.missing, {paddingHorizontal: spacing.base, paddingTop: spacing.xl}]}>
          <Text style={[typography.title3, {color: colors.text}]}>Transaction not found</Text>
          <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.sm}]}>
            This transaction may have been deleted or is no longer available.
          </Text>
          <View style={{marginTop: spacing.lg}}>
            <Button onPress={() => navigation.goBack()} title="Go back" />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const tagsText = transaction.tags.length > 0 ? transaction.tags.join(', ') : '—';
  const notesText = transaction.notes.trim() || '—';
  const merchantText = transaction.merchant.trim() || '—';
  const descText = transaction.description.trim() || '—';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.base,
            paddingBottom: insets.bottom + spacing['2xl'],
            gap: spacing.base,
          }}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.topBar, {paddingTop: spacing.sm}]}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => navigation.goBack()}>
              <Text style={[typography.callout, {color: colors.primary, fontWeight: '600'}]}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.amountBlock}>
            <Text style={[styles.amountText, {color: amountColor}]}>
              {amountDisplay.sign}
              {amountDisplay.body}
            </Text>
            <Text style={[typography.footnote, {color: colors.textTertiary, marginTop: 4}]}>
              {transaction.currency}
            </Text>
          </View>

          <View style={styles.categoryBlock}>
            <View style={[styles.categoryCircle, {backgroundColor: category.color}]}>
              <AppIcon name={resolveIconName(category.icon)} size={28} color="#FFFFFF" />
            </View>
            <Text style={[typography.title3, {color: colors.text, marginTop: spacing.sm}]}>{category.name}</Text>
          </View>

          <Card padding="md">
            <Text style={[typography.caption, {color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.sm}]}>
              Details
            </Text>
            <DetailRow label="Type" value={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} />
            <DetailRow label="Date" value={formatWhen(transaction.transactionDate)} />
            <DetailRow label="Merchant" value={merchantText} />
            <DetailRow label="Source" value={formatSourceLabel(transaction.source)} />
            <DetailRow label="Description" value={descText} />
            <DetailRow label="Notes" value={notesText} />
            <DetailRow label="Tags" value={tagsText} />
          </Card>

          <View style={styles.actions}>
            <Button fullWidth onPress={handleEdit} title="Edit" variant="outline" />
            <Pressable
              accessibilityLabel="Delete transaction"
              accessibilityRole="button"
              onPress={handleDelete}
              style={({pressed}) => [
                styles.ghostDanger,
                {
                  borderColor: colors.borderLight,
                  opacity: pressed ? 0.75 : 1,
                  marginTop: spacing.sm,
                },
              ]}>
              <Text style={[typography.callout, {color: colors.danger, fontWeight: '600'}]}>Delete</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountBlock: {
    alignItems: 'center',
    marginTop: 8,
  },
  amountText: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  categoryBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  categoryCircle: {
    alignItems: 'center',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  categoryIcon: {
    fontSize: 28,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actions: {
    marginTop: 8,
  },
  ghostDanger: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  missing: {
    flex: 1,
  },
});
