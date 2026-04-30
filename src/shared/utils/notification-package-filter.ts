import {isBuiltinParserPackage} from '@shared/constants/monitored-finance-apps';

/**
 * Built-in parser packages honor the user's monitored-app allowlist.
 * Other packages still flow to the orchestrator (custom regex rules, logging).
 */
export function makeShouldProcessNotification(monitoredPackageIds: string[]) {
  return (packageName: string): boolean => {
    if (!isBuiltinParserPackage(packageName)) {
      return true;
    }
    return monitoredPackageIds.includes(packageName);
  };
}
