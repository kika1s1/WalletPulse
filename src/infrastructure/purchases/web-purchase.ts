import {Linking} from 'react-native';
import {
  WEB_PURCHASE_BASE_URL,
  WEB_PURCHASE_LINK_ID,
  type WalletPulsePlanId,
} from '@shared/constants/purchase-constants';
import {getPurchasesAppUserId} from './revenue-cat-client';
import {getOrCreateAppUserId} from './app-user-id';

const FALLBACK_LINK_ID = 'qactvxrzvtzpvtji';

function getLinkId(): string {
  return WEB_PURCHASE_LINK_ID || FALLBACK_LINK_ID;
}

export function isWebPurchaseConfigured(): boolean {
  return getLinkId().length > 0;
}

function buildQueryString(params: Record<string, string>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export function buildWebPurchaseUrl(
  appUserId: string,
  options?: {packageId?: string},
): string {
  const base = `${WEB_PURCHASE_BASE_URL}/${getLinkId()}/${encodeURIComponent(appUserId)}`;
  const params: Record<string, string> = {};

  if (options?.packageId) {
    params.package_id = options.packageId;
  }

  return `${base}${buildQueryString(params)}`;
}

function planIdToPackageId(planId: WalletPulsePlanId): string {
  switch (planId) {
    case 'monthly':
      return '$rc_monthly';
    case 'yearly':
      return '$rc_annual';
    case 'lifetime':
      return '$rc_lifetime';
  }
}

async function resolveAppUserId(): Promise<string> {
  const sdkUserId = await getPurchasesAppUserId();
  if (sdkUserId) {
    return sdkUserId;
  }
  return getOrCreateAppUserId();
}

export async function openWebPurchase(
  planId: WalletPulsePlanId,
): Promise<{success: boolean; errorMessage: string | null}> {
  if (!isWebPurchaseConfigured()) {
    return {
      success: false,
      errorMessage: 'Web purchase is not configured.',
    };
  }

  const appUserId = await resolveAppUserId();

  const url = buildWebPurchaseUrl(appUserId, {
    packageId: planIdToPackageId(planId),
  });

  try {
    await Linking.openURL(url);
    return {success: true, errorMessage: null};
  } catch {
    return {
      success: false,
      errorMessage: 'Failed to open payment page. Please check your browser.',
    };
  }
}
