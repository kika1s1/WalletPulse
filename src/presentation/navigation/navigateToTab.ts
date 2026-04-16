import {navigationRef} from './navigationRef';

/**
 * Navigate to a screen inside a tab from within a nested stack navigator.
 * Tries navigation.getParent()?.navigate() first, falls back to the root
 * navigationRef when getParent() is unavailable (e.g. during initial mount).
 */
export function navigateToTab(
  navigation: {getParent?: () => {navigate: (...args: any[]) => void} | undefined},
  screen: string,
  params?: Record<string, unknown>,
): void {
  const parent = navigation.getParent?.();
  if (parent) {
    parent.navigate(screen, params);
    return;
  }

  if (navigationRef.isReady()) {
    (navigationRef.navigate as Function)('MainTabs', {screen, params});
  }
}
