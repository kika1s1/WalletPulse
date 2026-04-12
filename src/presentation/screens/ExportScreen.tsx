import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import {
  formatTransactionsAsCsv,
  formatTransactionsAsJson,
  formatTransactionsAsPdfHtml,
  buildExportFilename,
  type ExportFormat,
  type ExportOptions,
} from '@domain/usecases/export-transactions';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useCategories} from '@presentation/hooks/useCategories';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useAppStore} from '@presentation/stores/useAppStore';

const MS_PER_DAY = 86400000;

function exportTargetDirectory(): string {
  if (Platform.OS === 'android' && RNFS.DownloadDirectoryPath) {
    return RNFS.DownloadDirectoryPath;
  }
  return RNFS.DocumentDirectoryPath;
}

type PdfResult = {
  filePath: string;
  base64?: string;
};

async function generatePdfFile(
  fileBaseName: string,
  transactions: Parameters<typeof formatTransactionsAsPdfHtml>[0],
  options?: ExportOptions,
): Promise<PdfResult> {
  const html = formatTransactionsAsPdfHtml(transactions, options);
  const result = await generatePDF({
    html,
    fileName: fileBaseName,
    base64: true,
  });
  
  if (!result || !result.filePath) {
    throw new Error('PDF generation failed');
  }
  
  return result;
}

type DatePreset = {
  label: string;
  getRange: () => {startMs: number; endMs: number};
};

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Last 7 days',
    getRange: () => ({startMs: Date.now() - 7 * MS_PER_DAY, endMs: Date.now()}),
  },
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

export default function ExportScreen() {
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const insets = useSafeAreaInsets();

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [exportBusy, setExportBusy] = useState<'save' | 'share' | null>(null);
  const [lastExportInfo, setLastExportInfo] = useState<string | null>(null);
  const isExporting = exportBusy !== null;

  const {transactions, isLoading, error} = useTransactions({syncWithFilterStore: false});
  const {categories} = useCategories();

  const exportOptions: ExportOptions = useMemo(() => {
    const categoryMap: Record<string, string> = {};
    for (const c of categories) {
      categoryMap[c.id] = c.name;
    }
    return {categoryMap};
  }, [categories]);

  const dateRange = useMemo(
    () => DATE_PRESETS[selectedPreset].getRange(),
    [selectedPreset],
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.transactionDate >= dateRange.startMs &&
          t.transactionDate <= dateRange.endMs,
      ),
    [transactions, dateRange],
  );

  const stats = useMemo(() => {
    const totalExpense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return {count: filteredTransactions.length, totalExpense, totalIncome};
  }, [filteredTransactions]);

  const runShare = useCallback(async () => {
    if (isLoading) {
      return;
    }
    if (filteredTransactions.length === 0) {
      Alert.alert('No data', 'No transactions found in the selected date range.');
      return;
    }

    setExportBusy('share');
    try {
      const filename = buildExportFilename(format);
      if (format === 'csv' || format === 'json') {
        const content =
          format === 'csv'
            ? formatTransactionsAsCsv(filteredTransactions, exportOptions)
            : formatTransactionsAsJson(filteredTransactions, exportOptions);
        await Share.share({
          message: content,
          title: filename,
        });
      } else {
        const baseName = filename.replace(/\.pdf$/i, '');
        const result = await generatePdfFile(baseName, filteredTransactions, exportOptions);
        
        const cachePath = `${RNFS.CachesDirectoryPath}/${filename}`;
        if (result.base64) {
          await RNFS.writeFile(cachePath, result.base64, 'base64');
        } else if (result.filePath) {
          await RNFS.copyFile(result.filePath, cachePath);
        }
        
        await RNShare.open({
          url: `file://${cachePath}`,
          type: 'application/pdf',
          failOnCancel: false,
        });
      }

      setLastExportInfo(
        `Shared ${filteredTransactions.length} transactions as ${format.toUpperCase()}`,
      );
    } catch (err) {
      const errorMessage = (err as Error)?.message || '';
      if (__DEV__) { console.log('Share error:', errorMessage); }
      if (
        !errorMessage.includes('User did not share') &&
        !errorMessage.includes('dismissedAction') &&
        !errorMessage.includes('cancel')
      ) {
        Alert.alert('Share failed', errorMessage || 'Something went wrong while sharing.');
      }
    } finally {
      setExportBusy(null);
    }
  }, [filteredTransactions, format, isLoading, exportOptions]);

  const runSaveToDevice = useCallback(async () => {
    if (isLoading) {
      return;
    }
    if (filteredTransactions.length === 0) {
      Alert.alert('No data', 'No transactions found in the selected date range.');
      return;
    }

    setExportBusy('save');
    try {
      const filename = buildExportFilename(format);
      const dir = exportTargetDirectory();
      let savedPath: string;

      if (format === 'pdf') {
        const baseName = filename.replace(/\.pdf$/i, '');
        const result = await generatePdfFile(baseName, filteredTransactions, exportOptions);
        
        const targetPath = `${dir}/${filename}`;
        if (result.base64) {
          await RNFS.writeFile(targetPath, result.base64, 'base64');
        } else {
          await RNFS.copyFile(result.filePath, targetPath);
        }
        savedPath = targetPath;
      } else {
        const content =
          format === 'csv'
            ? formatTransactionsAsCsv(filteredTransactions, exportOptions)
            : formatTransactionsAsJson(filteredTransactions, exportOptions);
        savedPath = `${dir}/${filename}`;
        await RNFS.writeFile(savedPath, content, 'utf8');
      }

      setLastExportInfo(
        `Saved ${filteredTransactions.length} transactions as ${filename}`,
      );
      Alert.alert(
        'Saved',
        `File saved successfully.\n\n${savedPath}`,
        [{text: 'OK'}],
      );
    } catch {
      Alert.alert('Save failed', 'Could not write the file. Check storage permissions and try again.');
    } finally {
      setExportBusy(null);
    }
  }, [exportOptions, filteredTransactions, format, isLoading]);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View
          style={[
            styles.header,
            {paddingHorizontal: spacing.base, paddingTop: spacing.sm},
          ]}
        >
          <BackButton />
          <Text style={[typography.title3, {color: colors.text}]}>Export Data</Text>
          <View style={{width: 48}} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Format selector */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
              EXPORT FORMAT
            </Text>
            <View style={styles.formatRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{selected: format === 'csv'}}
                onPress={() => setFormat('csv')}
                style={[
                  styles.formatCard,
                  {
                    borderColor: format === 'csv' ? colors.primary : colors.border,
                    borderWidth: format === 'csv' ? 2 : 1,
                    borderRadius: radius.md,
                    backgroundColor:
                      format === 'csv' ? colors.primaryLight + '15' : colors.surfaceElevated,
                  },
                ]}
              >
                <Text style={[styles.formatIcon, {color: format === 'csv' ? colors.primary : colors.textTertiary}]}>
                  CSV
                </Text>
                <Text style={[styles.formatLabel, {color: colors.text}]}>
                  Spreadsheet
                </Text>
                <Text style={[styles.formatDesc, {color: colors.textTertiary}]}>
                  Excel, Sheets
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="radio"
                accessibilityState={{selected: format === 'json'}}
                onPress={() => setFormat('json')}
                style={[
                  styles.formatCard,
                  {
                    borderColor: format === 'json' ? colors.primary : colors.border,
                    borderWidth: format === 'json' ? 2 : 1,
                    borderRadius: radius.md,
                    backgroundColor:
                      format === 'json' ? colors.primaryLight + '15' : colors.surfaceElevated,
                  },
                ]}
              >
                <Text style={[styles.formatIcon, {color: format === 'json' ? colors.primary : colors.textTertiary}]}>
                  JSON
                </Text>
                <Text style={[styles.formatLabel, {color: colors.text}]}>
                  Developer
                </Text>
                <Text style={[styles.formatDesc, {color: colors.textTertiary}]}>
                  APIs, backups
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="radio"
                accessibilityState={{selected: format === 'pdf'}}
                onPress={() => setFormat('pdf')}
                style={[
                  styles.formatCard,
                  {
                    borderColor: format === 'pdf' ? colors.primary : colors.border,
                    borderWidth: format === 'pdf' ? 2 : 1,
                    borderRadius: radius.md,
                    backgroundColor:
                      format === 'pdf' ? colors.primaryLight + '15' : colors.surfaceElevated,
                  },
                ]}
              >
                <Text style={[styles.formatIcon, {color: format === 'pdf' ? colors.primary : colors.textTertiary}]}>
                  PDF
                </Text>
                <Text style={[styles.formatLabel, {color: colors.text}]}>
                  Report
                </Text>
                <Text style={[styles.formatDesc, {color: colors.textTertiary}]}>
                  Print, archive
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Date range */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
              DATE RANGE
            </Text>
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

          {/* Preview stats */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={[
              styles.previewCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.lg,
                borderColor: colors.border,
              },
              shadows.sm,
            ]}
          >
            <Text style={[styles.previewTitle, {color: colors.text}]}>Export Preview</Text>
            {isLoading ? (
              <View style={styles.previewLoading}>
                <ActivityIndicator accessibilityLabel="Loading transactions" color={colors.primary} size="large" />
                <Text style={[typography.caption, {color: colors.textTertiary, marginTop: spacing.sm}]}>
                  Loading transactions…
                </Text>
              </View>
            ) : error ? (
              <Text style={[typography.body, {color: colors.danger}]}>{error}</Text>
            ) : (
              <>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, {color: colors.primary}]}>{stats.count}</Text>
                    <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Transactions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, {color: colors.danger}]}>
                      {formatAmountMasked(stats.totalExpense, baseCurrency, hide)}
                    </Text>
                    <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Expenses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, {color: colors.success}]}>
                      {formatAmountMasked(stats.totalIncome, baseCurrency, hide)}
                    </Text>
                    <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Income</Text>
                  </View>
                </View>

                <View style={[styles.fieldsList, {borderTopColor: colors.border}]}>
                  <Text style={[styles.fieldsTitle, {color: colors.textSecondary}]}>
                    Included fields:
                  </Text>
                  <Text style={[styles.fieldsText, {color: colors.textTertiary}]}>
                    Date, Amount, Currency, Type, Category, Description, Merchant, Source, Tags, Notes, Recurring
                  </Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* Last export info */}
          {lastExportInfo && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.successBanner, {backgroundColor: colors.successLight, borderRadius: radius.md}]}
            >
              <Text style={[styles.successText, {color: colors.success}]}>{lastExportInfo}</Text>
            </Animated.View>
          )}

          {/* Save and Share */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(300)}
            style={styles.exportActions}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save export file to device"
              disabled={isExporting || isLoading || Boolean(error)}
              onPress={runSaveToDevice}
              style={({pressed}) => [
                styles.exportBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  opacity: pressed || exportBusy === 'save' ? 0.8 : 1,
                },
              ]}
            >
              {exportBusy === 'save' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.exportBtnText}>
                  Save to device ({stats.count} as {format.toUpperCase()})
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share export"
              disabled={isExporting || isLoading || Boolean(error)}
              onPress={runShare}
              style={({pressed}) => [
                styles.shareBtn,
                {
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                  opacity: pressed || exportBusy === 'share' ? 0.75 : 1,
                },
              ]}
            >
              {exportBusy === 'share' ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[styles.shareBtnText, {color: colors.primary}]}>
                  Share
                </Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Info note */}
          <View style={[styles.infoNote, {backgroundColor: colors.primaryLight + '12', borderRadius: radius.md}]}>
            <Text style={[styles.infoText, {color: colors.textSecondary}]}>
              Exported data includes all transaction fields. Amounts use major currency units (e.g., 12.99 instead of 1299 cents). Save writes to your Downloads folder on Android. CSV and JSON share as text; PDF shares the actual file for easy attachment to emails or messages.
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  scrollContent: {
    gap: 20,
    paddingTop: 12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
  },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formatCard: {
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: 96,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  formatIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  formatDesc: {
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewCard: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  previewLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  fieldsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 4,
  },
  fieldsTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
  fieldsText: {
    fontSize: 12,
    lineHeight: 18,
  },
  successBanner: {
    padding: 12,
    alignItems: 'center',
  },
  successText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  exportActions: {
    gap: 12,
  },
  exportBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  shareBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  infoNote: {
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
