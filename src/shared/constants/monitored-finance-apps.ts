export type MonitoredFinanceAppItem = {
  packageId: string;
  label: string;
};

/** Built-in notification parsers (must match parser-registry package keys). */
export const BUILTIN_MONITORED_FINANCE_APPS: MonitoredFinanceAppItem[] = [
  {packageId: 'com.payoneer.android', label: 'Payoneer'},
  {packageId: 'com.grey.android', label: 'Grey'},
  {packageId: 'com.dukascopy.bank', label: 'Dukascopy Bank'},
];

export const DEFAULT_MONITORED_APP_PACKAGE_IDS: string[] =
  BUILTIN_MONITORED_FINANCE_APPS.map((a) => a.packageId);

const BUILTIN_SET = new Set(DEFAULT_MONITORED_APP_PACKAGE_IDS);

export function isBuiltinParserPackage(packageId: string): boolean {
  return BUILTIN_SET.has(packageId);
}
