import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import RNShare from 'react-native-share';
import {generatePDF} from 'react-native-html-to-pdf';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout';
import {BackButton, Chip} from '@presentation/components/common';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useWallets} from '@presentation/hooks/useWallets';
import {useCategories} from '@presentation/hooks/useCategories';
import {useAuthStore} from '@presentation/stores/useAuthStore';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {generateStatementHtml, computeStatementSummary} from '@domain/usecases/generate-statement';

const MS_PER_DAY = 86400000;

type DatePreset = {
  label: string;
  getRange: () => {startMs: number; endMs: number};
};

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Last 30 days',
    getRange: () => ({startMs: Date.now() - 30 * MS_PER_DAY, endMs: Date.now()}),
  },
  {
    label: 'Last 90 days',
    getRange: () => ({startMs: Date.now() - 90 * MS_PER_DAY, endMs: Date.now()}),
  },
  {
    label: 'This year',
    getRange: () => ({
      startMs: new Date(new Date().getFullYear(), 0, 1).getTime(),
      endMs: Date.now(),
    }),
  },
  {
    label: 'All time',
    getRange: () => ({startMs: 0, endMs: Date.now()}),
  },
];

function exportTargetDirectory(): string {
  if (Platform.OS === 'android' && RNFS.DownloadDirectoryPath) {
    return RNFS.DownloadDirectoryPath;
  }
  return RNFS.DocumentDirectoryPath;
}

export default function AccountStatementScreen() {
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const insets = useSafeAreaInsets();

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [lastInfo, setLastInfo] = useState<string | null>(null);
  const isBusy = busy !== null;

  const user = useAuthStore((s) => s.user);
  const {wallets, isLoading: walletsLoading} = useWallets();
  const {categories} = useCategories();

  const activeWallet = useMemo(
    () => wallets.find((w) => w.id === selectedWalletId) ?? wallets[0] ?? null,
    [wallets, selectedWalletId],
  );

  const walletId = activeWallet?.id ?? '';

  const dateRange = useMemo(
    () => DATE_PRESETS[selectedPreset].getRange(),
    [selectedPreset],
  );

  const txFilter = useMemo(
    () => (walletId ? {walletId} : undefined),
    [walletId],
  );

  const {transactions: allWalletTx, isLoading: txLoading} = useTransactions({
    syncWithFilterStore: false,
    filter: txFilter,
  });

  const periodTx = useMemo(
    () =>
      allWalletTx
        .filter((t) => t.transactionDate >= dateRange.startMs && t.transactionDate <= dateRange.endMs)
        .sort((a, b) => a.transactionDate - b.transactionDate),
    [allWalletTx, dateRange],
  );

  const openingBalanceCents = useMemo(() => {
    if (!activeWallet) { return 0; }
    const currentBalance = activeWallet.balance;
    let netAfterPeriodStart = 0;
    for (const t of allWalletTx) {
      if (t.transactionDate >= dateRange.startMs) {
        netAfterPeriodStart += t.type === 'income' ? t.amount : -t.amount;
      }
    }
    return currentBalance - netAfterPeriodStart;
  }, [activeWallet, allWalletTx, dateRange]);

  const summary = useMemo(
    () => computeStatementSummary(periodTx, openingBalanceCents),
    [periodTx, openingBalanceCents],
  );

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) { map[c.id] = c.name; }
    return map;
  }, [categories]);

  const isLoading = walletsLoading || txLoading;

  const buildHtml = useCallback(() => {
    if (!activeWallet || !user) { return ''; }
    return generateStatementHtml({
      user: {fullName: user.fullName, email: user.email, address: user.address},
      wallet: {name: activeWallet.name, currency: activeWallet.currency},
      transactions: periodTx,
      categoryMap,
      dateRange,
      openingBalanceCents,
    });
  }, [activeWallet, user, periodTx, categoryMap, dateRange, openingBalanceCents]);

  const buildFilename = useCallback(() => {
    const d = new Date().toISOString().slice(0, 10);
    const w = activeWallet?.name.replace(/\s+/g, '-').toLowerCase() ?? 'wallet';
    return `walletpulse-statement-${w}-${d}`;
  }, [activeWallet]);

  const handleSave = useCallback(async () => {
    if (isLoading || !activeWallet) { return; }
    if (periodTx.length === 0) {
      Alert.alert('No data', 'No transactions found in the selected period for this wallet.');
      return;
    }
    setBusy('save');
    try {
      const html = buildHtml();
      const baseName = buildFilename();
      const result = await generatePDF({html, fileName: baseName, base64: true});
      if (!result?.filePath) { throw new Error('PDF generation failed'); }

      const dir = exportTargetDirectory();
      const targetPath = `${dir}/${baseName}.pdf`;
      if (result.base64) {
        await RNFS.writeFile(targetPath, result.base64, 'base64');
      } else {
        await RNFS.copyFile(result.filePath, targetPath);
      }
      setLastInfo(`Statement saved: ${baseName}.pdf`);
      Alert.alert('Saved', `Statement saved successfully.\n\n${targetPath}`, [{text: 'OK'}]);
    } catch {
      Alert.alert('Save failed', 'Could not generate the statement. Please try again.');
    } finally {
      setBusy(null);
    }
  }, [isLoading, activeWallet, periodTx, buildHtml, buildFilename]);

  const handleShare = useCallback(async () => {
    if (isLoading || !activeWallet) { return; }
    if (periodTx.length === 0) {
      Alert.alert('No data', 'No transactions found in the selected period for this wallet.');
      return;
    }
    setBusy('share');
    try {
      const html = buildHtml();
      const baseName = buildFilename();
      const result = await generatePDF({html, fileName: baseName, base64: true});
      if (!result?.filePath) { throw new Error('PDF generation failed'); }

      const cachePath = `${RNFS.CachesDirectoryPath}/${baseName}.pdf`;
      if (result.base64) {
        await RNFS.writeFile(cachePath, result.base64, 'base64');
      } else {
        await RNFS.copyFile(result.filePath, cachePath);
      }

      await RNShare.open({
        url: `file://${cachePath}`,
        type: 'application/pdf',
        failOnCancel: false,
      });
      setLastInfo(`Statement shared: ${baseName}.pdf`);
    } catch (err) {
      const msg = (err as Error)?.message ?? '';
      if (!msg.includes('User did not share') && !msg.includes('dismissedAction') && !msg.includes('cancel')) {
        Alert.alert('Share failed', msg || 'Something went wrong.');
      }
    } finally {
      setBusy(null);
    }
  }, [isLoading, activeWallet, periodTx, buildHtml, buildFilename]);

  const cur = activeWallet?.currency ?? 'USD';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View style={[styles.header, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <BackButton />
          <Text style={[typography.title3, {color: colors.text}]}>Account Statement</Text>
          <View style={{width: 48}} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, {paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 24}]}
          showsVerticalScrollIndicator={false}
        >
          {/* Wallet picker */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>SELECT WALLET</Text>
            {walletsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : wallets.length === 0 ? (
              <Text style={[{color: colors.textTertiary, fontSize: 13}]}>No wallets found</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletRow}>
                {wallets.map((w) => {
                  const isSelected = w.id === (activeWallet?.id ?? '');
                  return (
                    <Pressable
                      key={w.id}
                      accessibilityRole="radio"
                      accessibilityState={{selected: isSelected}}
                      onPress={() => setSelectedWalletId(w.id)}
                      style={[
                        styles.walletCard,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                          borderRadius: radius.md,
                          backgroundColor: isSelected ? colors.primaryLight + '15' : colors.surfaceElevated,
                        },
                      ]}
                    >
                      <AppIcon name={w.icon || 'wallet'} size={20} color={isSelected ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.walletName, {color: isSelected ? colors.primary : colors.text}]} numberOfLines={1}>
                        {w.name}
                      </Text>
                      <Text style={[styles.walletCurrency, {color: colors.textTertiary}]}>{w.currency}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>

          {/* Date range */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>STATEMENT PERIOD</Text>
            <View style={styles.chipRow}>
              {DATE_PRESETS.map((preset, idx) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  selected={selectedPreset === idx}
                  onPress={() => setSelectedPreset(idx)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Preview card */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={[styles.previewCard, {backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, borderColor: colors.border}, shadows.sm]}
          >
            <Text style={[styles.previewTitle, {color: colors.text}]}>Statement Preview</Text>
            {isLoading ? (
              <View style={styles.previewLoading}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[typography.caption, {color: colors.textTertiary, marginTop: spacing.sm}]}>Loading data…</Text>
              </View>
            ) : !activeWallet ? (
              <Text style={[{color: colors.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: 16}]}>
                Select a wallet to preview
              </Text>
            ) : (
              <>
                <View style={[styles.previewRow, {borderBottomColor: colors.border}]}>
                  <Text style={[styles.previewLabel, {color: colors.textTertiary}]}>Wallet</Text>
                  <Text style={[styles.previewValue, {color: colors.text}]}>{activeWallet.name}</Text>
                </View>
                <View style={[styles.previewRow, {borderBottomColor: colors.border}]}>
                  <Text style={[styles.previewLabel, {color: colors.textTertiary}]}>Transactions</Text>
                  <Text style={[styles.previewValue, {color: colors.primary}]}>{periodTx.length}</Text>
                </View>
                <View style={[styles.previewRow, {borderBottomColor: colors.border}]}>
                  <Text style={[styles.previewLabel, {color: colors.textTertiary}]}>Opening Balance</Text>
                  <Text style={[styles.previewValue, {color: colors.text}]}>
                    {formatAmountMasked(summary.openingBalance, cur, hide)}
                  </Text>
                </View>
                <View style={[styles.previewRow, {borderBottomColor: colors.border}]}>
                  <Text style={[styles.previewLabel, {color: colors.textTertiary}]}>Total Credits</Text>
                  <Text style={[styles.previewValue, {color: colors.success}]}>
                    {formatAmountMasked(summary.totalCredits, cur, hide)}
                  </Text>
                </View>
                <View style={[styles.previewRow, {borderBottomColor: colors.border}]}>
                  <Text style={[styles.previewLabel, {color: colors.textTertiary}]}>Total Debits</Text>
                  <Text style={[styles.previewValue, {color: colors.danger}]}>
                    {formatAmountMasked(summary.totalDebits, cur, hide)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, {color: colors.textTertiary}]}>Closing Balance</Text>
                  <Text style={[styles.previewValue, {color: colors.text, fontWeight: fontWeight.bold}]}>
                    {formatAmountMasked(summary.closingBalance, cur, hide)}
                  </Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* Success banner */}
          {lastInfo && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.successBanner, {backgroundColor: colors.successLight, borderRadius: radius.md}]}
            >
              <Text style={[styles.successText, {color: colors.success}]}>{lastInfo}</Text>
            </Animated.View>
          )}

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(400).duration(300)} style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save statement to device"
              disabled={isBusy || isLoading || !activeWallet}
              onPress={handleSave}
              style={({pressed}) => [
                styles.primaryBtn,
                {backgroundColor: colors.primary, borderRadius: radius.md, opacity: pressed || busy === 'save' ? 0.8 : 1},
              ]}
            >
              {busy === 'save' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Save to Device</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share statement"
              disabled={isBusy || isLoading || !activeWallet}
              onPress={handleShare}
              style={({pressed}) => [
                styles.shareBtn,
                {borderColor: colors.primary, borderRadius: radius.md, opacity: pressed || busy === 'share' ? 0.75 : 1},
              ]}
            >
              {busy === 'share' ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[styles.shareBtnText, {color: colors.primary}]}>Share</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Info note */}
          <View style={[styles.infoNote, {backgroundColor: colors.primaryLight + '12', borderRadius: radius.md}]}>
            <Text style={[styles.infoText, {color: colors.textSecondary}]}>
              The statement includes your account details, a transaction ledger with running balance, and a category breakdown.
              Set your address in Profile for it to appear on the statement.
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  scrollContent: {gap: 20, paddingTop: 12},
  section: {gap: 10},
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
  },
  walletRow: {gap: 10, paddingVertical: 2},
  walletCard: {
    width: 110,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
  },
  walletName: {fontSize: 13, fontWeight: fontWeight.semibold, textAlign: 'center'},
  walletCurrency: {fontSize: 11},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  previewCard: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 0,
  },
  previewTitle: {fontSize: 16, fontWeight: fontWeight.semibold, marginBottom: 12},
  previewLoading: {alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 4},
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewLabel: {fontSize: 13},
  previewValue: {fontSize: 14, fontWeight: fontWeight.semibold},
  successBanner: {padding: 12, alignItems: 'center'},
  successText: {fontSize: 13, fontWeight: fontWeight.semibold},
  actions: {gap: 12},
  primaryBtn: {height: 52, alignItems: 'center', justifyContent: 'center'},
  primaryBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: fontWeight.semibold},
  shareBtn: {height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: 'transparent'},
  shareBtnText: {fontSize: 16, fontWeight: fontWeight.semibold},
  infoNote: {padding: 12},
  infoText: {fontSize: 12, lineHeight: 18},
});
