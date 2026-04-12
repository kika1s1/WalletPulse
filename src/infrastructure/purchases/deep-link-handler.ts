import {Linking} from 'react-native';
import {APP_DEEP_LINK_SCHEME} from '@shared/constants/purchase-constants';
import {refreshCustomerInfo} from './revenue-cat-client';

type DeepLinkCallback = (refreshed: boolean) => void;

let listener: ReturnType<typeof Linking.addEventListener> | null = null;

function isWalletPulseDeepLink(url: string): boolean {
  return url.startsWith(`${APP_DEEP_LINK_SCHEME}://`);
}

export function setupDeepLinkHandler(onRefreshed?: DeepLinkCallback): void {
  if (listener) {
    return;
  }

  listener = Linking.addEventListener('url', ({url}) => {
    if (!isWalletPulseDeepLink(url)) {
      return;
    }
    void refreshCustomerInfo().then(info => {
      onRefreshed?.(info !== null);
    });
  });
}

export function removeDeepLinkHandler(): void {
  listener?.remove();
  listener = null;
}

export async function handleInitialDeepLink(): Promise<void> {
  try {
    const url = await Linking.getInitialURL();
    if (url && isWalletPulseDeepLink(url)) {
      await refreshCustomerInfo();
    }
  } catch {
    // Non-fatal
  }
}
