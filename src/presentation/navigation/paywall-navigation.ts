import {navigationRef} from './navigationRef';
import type {PaywallScreenParams} from './types';

export function navigateToPaywall(source: string, feature?: string): void {
  if (navigationRef.isReady()) {
    const params: PaywallScreenParams = {source, feature};
    navigationRef.navigate('Paywall', params);
  }
}

export function navigateToManageSubscription(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTabs', {
      screen: 'SettingsTab',
      params: {screen: 'ManageSubscription'},
    });
  }
}
