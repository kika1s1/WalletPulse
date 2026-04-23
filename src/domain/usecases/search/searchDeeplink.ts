// Minimal helpers for the `walletpulse://search?q=...` deeplink.
//
// The actual native url-scheme wiring lives in the platform manifest and
// the `linking` prop of NavigationContainer — we don't configure either
// here yet because this overhaul is scoped to the feature itself, not to
// app bootstrap. These helpers are ready so that when the scheme is
// added, the Search screen can read the query off the route params and
// round-trip it via `buildSearchDeeplink`.

const SCHEME = 'walletpulse';
const PATH = 'search';

export function buildSearchDeeplink(rawQuery: string): string {
  const encoded = encodeURIComponent(rawQuery.trim());
  return `${SCHEME}://${PATH}?q=${encoded}`;
}

export function parseSearchDeeplink(url: string): {q: string} | null {
  try {
    // URL is not a perfect match for RN's URL polyfill but is fine for
    // our scheme-prefixed links where the host is always "search".
    const u = new URL(url);
    if (u.protocol.replace(':', '') !== SCHEME) { return null; }
    if (u.host !== PATH && u.pathname.replace(/^\/\//, '') !== PATH) {
      return null;
    }
    const q = u.searchParams.get('q') ?? '';
    return {q};
  } catch {
    return null;
  }
}

// Linking config snippet callers can spread into NavigationContainer's
// `linking` prop once native url scheme registration lands.
export const SEARCH_LINKING_CONFIG = {
  prefixes: [`${SCHEME}://`],
  config: {
    screens: {
      TransactionsTab: {
        screens: {
          Search: `${PATH}`,
        },
      },
    },
  },
} as const;
