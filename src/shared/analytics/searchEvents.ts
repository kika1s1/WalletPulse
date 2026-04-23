// Lightweight analytics surface for search telemetry.
//
// WalletPulse doesn't have a wired-up analytics sink yet, so this module
// deliberately keeps the contract small: one `emitSearchEvent` entry
// point plus a `setSearchAnalyticsSink` registration hook. When the app
// adopts a real analytics tool (Segment / Amplitude / Firebase / etc.)
// whoever wires it up just calls `setSearchAnalyticsSink` once at
// startup and every event from the search UI flows through.
//
// Until then, events go to `console.debug` in development and are
// silently dropped in production — see `shouldLogToConsole`.

export type SearchEventName =
  | 'search_submitted'
  | 'search_zero_results'
  | 'search_result_opened'
  | 'search_filter_applied'
  | 'search_offline_used';

export type SearchEventPayload = Record<string, unknown>;

export type SearchAnalyticsSink = (
  name: SearchEventName,
  payload: SearchEventPayload,
) => void;

let sink: SearchAnalyticsSink | null = null;

export function setSearchAnalyticsSink(next: SearchAnalyticsSink | null): void {
  sink = next;
}

function shouldLogToConsole(): boolean {
  // __DEV__ is a React Native global. Guard for non-RN runtimes (jest).
  const dev = (globalThis as {__DEV__?: boolean}).__DEV__;
  return dev === true;
}

export function emitSearchEvent(
  name: SearchEventName,
  payload: SearchEventPayload = {},
): void {
  try {
    sink?.(name, payload);
  } catch {
    // Never let analytics crash search.
  }
  if (!sink && shouldLogToConsole()) {
    // eslint-disable-next-line no-console
    console.debug(`[search] ${name}`, payload);
  }
}
