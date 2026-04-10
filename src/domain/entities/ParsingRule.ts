export type ParsingRule = {
  id: string;
  sourceApp: string;
  packageName: string;
  ruleName: string;
  pattern: string;
  transactionType: 'income' | 'expense';
  isActive: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateParsingRuleInput = {
  id: string;
  sourceApp: string;
  packageName: string;
  ruleName: string;
  pattern: string;
  transactionType: 'income' | 'expense';
  isActive: boolean;
  priority: number;
};

export function validateParsingRule(input: CreateParsingRuleInput): string | null {
  if (!input.sourceApp.trim()) {return 'Source app name is required';}
  if (!input.packageName.trim()) {return 'Package name is required';}
  if (!input.ruleName.trim()) {return 'Rule name is required';}
  if (!input.pattern.trim()) {return 'Pattern is required';}
  try {
    new RegExp(input.pattern);
  } catch {
    return 'Invalid regex pattern';
  }
  return null;
}

export function testPattern(
  pattern: string,
  text: string,
): {matched: boolean; groups: Record<string, string>} {
  try {
    const regex = new RegExp(pattern);
    const match = regex.exec(text);
    if (!match) {return {matched: false, groups: {}};}
    const groups: Record<string, string> = {};
    if (match.groups) {
      for (const [key, val] of Object.entries(match.groups)) {
        if (val !== undefined) {groups[key] = val;}
      }
    }
    return {matched: true, groups};
  } catch {
    return {matched: false, groups: {}};
  }
}
