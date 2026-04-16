import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmount} from '@shared/utils/format-currency';
import {POPULAR_CURRENCIES} from '@shared/constants/currencies';
import {SUPPORTED_CURRENCIES} from '@domain/value-objects/Currency';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {Spacer} from '@presentation/components/layout/Spacer';
import {Card} from '@presentation/components/common/Card';
import {Button} from '@presentation/components/common/Button';
import {BackButton} from '@presentation/components/common/BackButton';
import {AmountInput} from '@presentation/components/common/AmountInput';
import {CurrencyPicker} from '@presentation/components/common/CurrencyPicker';
import {useFxRates, useConvertCurrency} from '@presentation/hooks/useFxRates';
import {useAppStore} from '@presentation/stores/useAppStore';

type ActivePicker = 'from' | 'to' | null;

function getSymbol(code: string): string {
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return info?.symbol ?? code;
}

function formatLastUpdated(ms: number | null): string {
  if (!ms) {
    return 'Never synced';
  }
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CurrencyConverterScreen() {
  const {colors, spacing, radius, typography} = useTheme();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {isLoading: ratesLoading, error: ratesError, lastFetched, isStale, refresh} = useFxRates();
  const {convert} = useConvertCurrency();

  const [fromCurrency, setFromCurrency] = useState<string>(baseCurrency);
  const [toCurrency, setToCurrency] = useState<string>(
    POPULAR_CURRENCIES.find((c) => c !== baseCurrency) ?? 'EUR',
  );
  const [amountCents, setAmountCents] = useState(0);
  const [resultCents, setResultCents] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const swapScale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);

  const swapAnimStyle = useAnimatedStyle(() => ({
    transform: [{rotate: '90deg'}, {scale: swapScale.value}],
  }));

  const resultAnimStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
  }));

  const autoConvertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doConvert = useCallback(async () => {
    if (amountCents <= 0) {
      setResultCents(null);
      setRate(null);
      setConvError(null);
      return;
    }

    setConverting(true);
    setConvError(null);

    try {
      const result = await convert(amountCents, fromCurrency, toCurrency);
      if (result) {
        setResultCents(result.amountCents);
        setRate(result.rate);
        resultOpacity.value = 0;
        resultOpacity.value = withTiming(1, {duration: 300});
      } else {
        setConvError('No exchange rate available for this pair. Try refreshing rates.');
        setResultCents(null);
        setRate(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setConvError(msg);
      setResultCents(null);
      setRate(null);
    } finally {
      setConverting(false);
    }
  }, [amountCents, convert, fromCurrency, resultOpacity, toCurrency]);

  useEffect(() => {
    if (autoConvertTimerRef.current) {
      clearTimeout(autoConvertTimerRef.current);
    }
    if (amountCents > 0) {
      autoConvertTimerRef.current = setTimeout(doConvert, 350);
    } else {
      setResultCents(null);
      setRate(null);
    }
    return () => {
      if (autoConvertTimerRef.current) {
        clearTimeout(autoConvertTimerRef.current);
      }
    };
  }, [amountCents, fromCurrency, toCurrency, doConvert]);

  const handleSwap = useCallback(() => {
    swapScale.value = withSequence(
      withSpring(1.25, {damping: 8, stiffness: 300}),
      withSpring(1, {damping: 12, stiffness: 200}),
    );
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }, [fromCurrency, toCurrency, swapScale]);

  const popularChips = useMemo(
    () =>
      POPULAR_CURRENCIES.filter(
        (c) => c !== fromCurrency && c !== toCurrency,
      ).slice(0, 6),
    [fromCurrency, toCurrency],
  );

  const handleQuickSelect = useCallback(
    (code: string) => {
      setToCurrency(code);
    },
    [],
  );

  return (
    <ScreenContainer>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.base} />

        <View style={styles.header}>
          <BackButton />
          <Text style={[styles.screenTitle, {color: colors.text}]}>
            Currency Converter
          </Text>
          <View style={{width: 32}} />
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusText, {color: colors.textSecondary}]}>
            Rates: {formatLastUpdated(lastFetched)}
          </Text>
          {isStale && (
            <Text style={[styles.staleBadge, {color: colors.warning}]}>
              {' '}Stale
            </Text>
          )}
        </View>

        <Spacer size={spacing.lg} />

        <Card padding="md">
          <Text
            style={[styles.sectionLabel, {color: colors.textSecondary}]}>
            From
          </Text>
          <AmountInput
            value={amountCents}
            onChangeValue={setAmountCents}
            currency={fromCurrency}
            currencySymbol={getSymbol(fromCurrency)}
            onCurrencyPress={() => setActivePicker('from')}
            autoFocus
            testID="converter-from"
          />
        </Card>

        <View style={styles.swapRow}>
          <View style={[styles.swapLine, {backgroundColor: colors.border}]} />
          <Pressable
            accessibilityLabel="Swap currencies"
            accessibilityRole="button"
            onPress={handleSwap}
            style={({pressed}) => [
              styles.swapBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.full,
              },
              pressed && styles.swapPressed,
            ]}>
            <Animated.Text style={[styles.swapIcon, swapAnimStyle]}>
              ⇄
            </Animated.Text>
          </Pressable>
          <View style={[styles.swapLine, {backgroundColor: colors.border}]} />
        </View>

        <Card padding="md">
          <Text
            style={[styles.sectionLabel, {color: colors.textSecondary}]}>
            To
          </Text>
          <View style={styles.resultRow}>
            <Pressable
              accessibilityLabel="Select target currency"
              accessibilityRole="button"
              onPress={() => setActivePicker('to')}
              style={[
                styles.resultCurrencyChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}>
              <Text style={[styles.chipText, {color: colors.text}]}>
                {getSymbol(toCurrency)}
              </Text>
              <Text style={[styles.chipCode, {color: colors.textSecondary}]}>
                {toCurrency}
              </Text>
            </Pressable>
            <Animated.View style={[styles.resultAmountBlock, resultAnimStyle]}>
              {resultCents !== null ? (
                <Text
                  style={[styles.resultAmount, {color: colors.text}]}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  {formatAmount(resultCents, toCurrency)}
                </Text>
              ) : amountCents > 0 && converting ? (
                <Text style={[styles.resultPlaceholder, {color: colors.textTertiary}]}>
                  Converting...
                </Text>
              ) : (
                <Text style={[styles.resultPlaceholder, {color: colors.textTertiary}]}>
                  0.00
                </Text>
              )}
            </Animated.View>
          </View>
        </Card>

        {rate !== null && amountCents > 0 && (
          <>
            <Spacer size={spacing.sm} />
            <Text
              style={[styles.rateLabel, {color: colors.textSecondary}]}
              accessibilityLabel={`1 ${fromCurrency} equals ${rate.toFixed(4)} ${toCurrency}`}>
              1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
            </Text>
          </>
        )}

        {convError && (
          <>
            <Spacer size={spacing.sm} />
            <Text style={[styles.errorText, {color: colors.danger}]}>
              {convError}
            </Text>
          </>
        )}

        {ratesError && (
          <>
            <Spacer size={spacing.sm} />
            <Text style={[styles.errorText, {color: colors.danger}]}>
              {ratesError}
            </Text>
          </>
        )}

        <Spacer size={spacing.lg} />

        <Text
          style={[styles.quickLabel, {color: colors.textSecondary}]}>
          Quick Select
        </Text>
        <Spacer size={spacing.sm} />
        <View style={styles.chipsRow}>
          {popularChips.map((code) => {
            const isSelected = code === toCurrency;
            return (
              <Pressable
                key={code}
                accessibilityLabel={`Convert to ${code}`}
                accessibilityRole="button"
                accessibilityState={{selected: isSelected}}
                onPress={() => handleQuickSelect(code)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surfaceElevated,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radius.full,
                  },
                ]}>
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontWeight: isSelected
                        ? fontWeight.semibold
                        : fontWeight.regular,
                    },
                  ]}>
                  {code}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Spacer size={spacing.xl} />

        <Button
          title={ratesLoading ? 'Refreshing...' : 'Refresh Exchange Rates'}
          onPress={refresh}
          variant="outline"
          loading={ratesLoading}
          disabled={ratesLoading}
          fullWidth
        />

        <Spacer size={spacing.xl} />
      </View>

      <CurrencyPicker
        visible={activePicker !== null}
        onClose={() => setActivePicker(null)}
        onSelect={(code) => {
          if (activePicker === 'from') {
            if (code === toCurrency) {
              setToCurrency(fromCurrency);
            }
            setFromCurrency(code);
          } else {
            if (code === fromCurrency) {
              setFromCurrency(toCurrency);
            }
            setToCurrency(code);
          }
          setActivePicker(null);
        }}
        selectedCode={activePicker === 'from' ? fromCurrency : toCurrency}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
  },
  staleBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -8,
    zIndex: 10,
  },
  swapLine: {
    flex: 1,
    height: 1,
  },
  swapBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  swapPressed: {
    opacity: 0.85,
  },
  swapIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  resultCurrencyChip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    maxWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
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
  resultAmountBlock: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 56,
  },
  resultAmount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'right',
  },
  resultPlaceholder: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'right',
  },
  rateLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickChipText: {
    fontSize: 14,
  },
});
