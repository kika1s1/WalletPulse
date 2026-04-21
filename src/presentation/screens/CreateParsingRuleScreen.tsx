import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton, Button, Input} from '@presentation/components/common';
import {ScreenContainer} from '@presentation/components/layout';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';
import {
  testPattern,
  validateParsingRule,
  type CreateParsingRuleInput,
} from '@domain/entities/ParsingRule';
import {generateId} from '@shared/utils/hash';
import {useParsingRules} from '@presentation/hooks/useParsingRules';
import type {SettingsStackParamList} from '@presentation/navigation/types';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CreateParsingRule'>;
type Route = RouteProp<SettingsStackParamList, 'CreateParsingRule'>;

export default function CreateParsingRuleScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, typography} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ruleId = route.params?.ruleId;

  const {addRule, updateRule} = useParsingRules();

  const [sourceApp, setSourceApp] = useState('');
  const [packageName, setPackageName] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [pattern, setPattern] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [priorityStr, setPriorityStr] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [sampleText, setSampleText] = useState('');
  const [testResult, setTestResult] = useState<{matched: boolean; groups: Record<string, string>} | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!ruleId) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ds = getSupabaseDataSource();
        const all = await ds.parsingRules.findAll();
        const found = all.find((r) => r.id === ruleId);
        if (cancelled) {
          return;
        }
        if (!found) {
          setLoadError('Rule was not found.');
          return;
        }
        setSourceApp(found.sourceApp);
        setPackageName(found.packageName);
        setRuleName(found.ruleName);
        setPattern(found.pattern);
        setTransactionType(found.transactionType);
        setPriorityStr(String(found.priority));
        setIsActive(found.isActive);
      } catch {
        if (!cancelled) {
          setLoadError('Could not load rule.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ruleId]);

  const isEditing = Boolean(ruleId);

  const handleTest = useCallback(() => {
    const result = testPattern(pattern, sampleText);
    setTestResult(result);
  }, [pattern, sampleText]);

  const handleSave = useCallback(async () => {
    const priority = Number.parseInt(priorityStr, 10);
    const input: CreateParsingRuleInput = {
      id: ruleId ?? generateId(),
      sourceApp: sourceApp.trim(),
      packageName: packageName.trim(),
      ruleName: ruleName.trim(),
      pattern: pattern.trim(),
      transactionType,
      isActive,
      priority: Number.isFinite(priority) ? priority : 0,
    };
    const err = validateParsingRule(input);
    if (err) {
      Alert.alert('Check fields', err);
      return;
    }
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      if (ruleId) {
        await updateRule(ruleId, {
          sourceApp: input.sourceApp,
          packageName: input.packageName,
          ruleName: input.ruleName,
          pattern: input.pattern,
          transactionType: input.transactionType,
          isActive: input.isActive,
          priority: input.priority,
        });
      } else {
        await addRule(input);
      }
      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Save failed', msg);
    } finally {
      setIsSaving(false);
    }
  }, [
    addRule,
    isActive,
    isSaving,
    navigation,
    packageName,
    pattern,
    priorityStr,
    ruleId,
    ruleName,
    sourceApp,
    transactionType,
    updateRule,
  ]);

  const groupsPreview = useMemo(() => {
    if (!testResult) {
      return '';
    }
    const entries = Object.entries(testResult.groups);
    if (entries.length === 0) {
      return '(no named groups)';
    }
    return entries.map(([k, v]) => `${k}: ${v}`).join('\n');
  }, [testResult]);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer avoidKeyboard noTopInset scrollable>
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
            {isEditing ? 'Edit rule' : 'New rule'}
          </Text>
          <View style={{width: 40}} />
        </View>

        <View style={{paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.md}}>
          {loadError ? (
            <Text style={{color: colors.danger, fontSize: 14}}>{loadError}</Text>
          ) : null}

          <Input label="Source App" onChangeText={setSourceApp} placeholder="e.g. My Bank" value={sourceApp} />
          <Input
            label="Package Name"
            onChangeText={setPackageName}
            placeholder="com.example.app"
            value={packageName}
            helperText="Android applicationId of the notifying app"
          />
          <Input label="Rule Name" onChangeText={setRuleName} placeholder="Identify this rule" value={ruleName} />

          <Text style={[styles.fieldLabel, {color: colors.textSecondary}]}>Pattern (regex)</Text>
          <TextInput
            accessibilityLabel="Regex pattern"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            onChangeText={setPattern}
            placeholder={'(?<amount>\\d+[.,]\\d{2}) (?<currency>[A-Z]{3})'}
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.patternInput,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                color: colors.text,
                padding: spacing.md,
              },
            ]}
            value={pattern}
          />

          <Text style={[styles.fieldLabel, {color: colors.textSecondary}]}>Transaction type</Text>
          <View style={[styles.chipRow, {gap: spacing.sm}]}>
            {(['expense', 'income'] as const).map((t) => {
              const selected = transactionType === t;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  key={t}
                  onPress={() => setTransactionType(t)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.borderLight,
                      borderRadius: radius.full,
                    },
                  ]}>
                  <Text
                    style={{
                      color: selected ? '#FFFFFF' : colors.text,
                      fontSize: 14,
                      fontWeight: fontWeight.semibold,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      textTransform: 'capitalize',
                    }}>
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            keyboardType="number-pad"
            label="Priority"
            onChangeText={setPriorityStr}
            value={priorityStr}
            helperText="Higher runs first when multiple rules match the same package"
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, {color: colors.text}]}>Active</Text>
            <Switch
              onValueChange={setIsActive}
              thumbColor={isActive ? colors.primary : colors.border}
              trackColor={{false: colors.borderLight, true: colors.primaryLight}}
              value={isActive}
            />
          </View>

          <View
            style={[
              styles.testCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                borderRadius: radius.md,
                padding: spacing.base,
              },
            ]}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>Test pattern</Text>
            <Input
              label="Sample notification text"
              multiline
              onChangeText={setSampleText}
              placeholder="Paste title and body as one line"
              value={sampleText}
            />
            <Button onPress={handleTest} title="Test" variant="secondary" />
            {testResult ? (
              <View style={{gap: spacing.xs, marginTop: spacing.sm}}>
                <Text style={{color: colors.text, fontWeight: fontWeight.semibold}}>
                  {testResult.matched ? 'Matched' : 'No match'}
                </Text>
                <Text style={[styles.groupsBlock, {color: colors.textSecondary}]} selectable>
                  {groupsPreview}
                </Text>
              </View>
            ) : null}
          </View>

          <Button
            disabled={Boolean(loadError) || isSaving}
            fullWidth
            loading={isSaving}
            onPress={handleSave}
            title={isEditing ? 'Save changes' : 'Save rule'}
          />
        </View>
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
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  patternInput: {
    borderWidth: 1,
    fontFamily: 'monospace',
    fontSize: 14,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
  testCard: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  groupsBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
