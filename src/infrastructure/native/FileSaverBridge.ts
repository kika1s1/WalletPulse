import {NativeModules, Platform} from 'react-native';

type NativeFileSaver = {
  saveFile(
    suggestedName: string,
    mimeType: string,
    data: string,
    encoding: 'utf8' | 'base64',
  ): Promise<SaveFileResult | null>;
  saveFileFromPath(
    suggestedName: string,
    mimeType: string,
    sourcePath: string,
  ): Promise<SaveFileResult | null>;
};

const {FileSaverBridge} = NativeModules as {FileSaverBridge?: NativeFileSaver};

export type SaveFileResult = {
  uri: string;
  displayName: string | null;
};

export type SaveOutcome =
  | {status: 'saved'; uri: string; displayName: string | null}
  | {status: 'cancelled'};

/**
 * Returns the native module if and only if it is fully wired up on the current
 * platform, otherwise `null`. Callers pattern-match on the return value so TS
 * can narrow without any non-null assertions.
 */
function getFileSaver(): NativeFileSaver | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  if (!FileSaverBridge || typeof FileSaverBridge.saveFile !== 'function') {
    return null;
  }
  return FileSaverBridge;
}

/**
 * Whether the system "choose location" file saver is available on this
 * platform. Currently Android-only; iOS support can be added via the Files app
 * Share Sheet if needed.
 */
export function isFileSaverAvailable(): boolean {
  return getFileSaver() !== null;
}

function toSaveOutcome(result: SaveFileResult | null): SaveOutcome {
  if (!result) {
    return {status: 'cancelled'};
  }
  return {status: 'saved', uri: result.uri, displayName: result.displayName};
}

/**
 * Presents the Android Storage Access Framework "Create Document" picker so
 * the user chooses where to save the file. Resolves to 'cancelled' if the user
 * backs out of the picker, or 'saved' with the content Uri on success.
 */
export async function saveFileWithPicker(params: {
  suggestedName: string;
  mimeType: string;
  data: string;
  encoding: 'utf8' | 'base64';
}): Promise<SaveOutcome> {
  const saver = getFileSaver();
  if (!saver) {
    throw new Error('File saver is not available on this platform.');
  }
  const result = await saver.saveFile(
    params.suggestedName,
    params.mimeType,
    params.data,
    params.encoding,
  );
  return toSaveOutcome(result);
}

/**
 * Like {@link saveFileWithPicker} but copies an existing local file (e.g. a
 * freshly generated PDF in the app's cache directory) to the destination
 * chosen by the user. Useful for large binary files to avoid passing big
 * base64 strings across the bridge.
 */
export async function saveLocalFileWithPicker(params: {
  suggestedName: string;
  mimeType: string;
  sourcePath: string;
}): Promise<SaveOutcome> {
  const saver = getFileSaver();
  if (!saver) {
    throw new Error('File saver is not available on this platform.');
  }
  const result = await saver.saveFileFromPath(
    params.suggestedName,
    params.mimeType,
    params.sourcePath,
  );
  return toSaveOutcome(result);
}
