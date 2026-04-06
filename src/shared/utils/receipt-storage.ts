import * as RNFS from '@dr.pogodin/react-native-fs';

import {receiptFileExtensionFromMime} from '@shared/utils/receipt-filename';

const RECEIPTS_SUBDIR = 'receipts';

export {receiptFileExtensionFromMime} from '@shared/utils/receipt-filename';

export function receiptsDirectoryPath(): string {
  return `${RNFS.DocumentDirectoryPath}/${RECEIPTS_SUBDIR}`;
}

export async function ensureReceiptsDir(): Promise<void> {
  const dir = receiptsDirectoryPath();
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
  }
}

function fileUriForAbsolutePath(absolutePath: string): string {
  return absolutePath.startsWith('file://') ? absolutePath : `file://${absolutePath}`;
}

function stripFileScheme(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

export type PickedReceiptAsset = {
  uri?: string;
  base64?: string;
  type?: string;
};

/**
 * Writes a picked image into the app documents directory and returns a durable file URI.
 */
export async function persistPickedReceipt(
  asset: PickedReceiptAsset,
  transactionId: string,
): Promise<string> {
  await ensureReceiptsDir();
  const ext = receiptFileExtensionFromMime(asset.type);
  const destPath = `${receiptsDirectoryPath()}/receipt-${transactionId}.${ext}`;

  if (asset.base64) {
    await RNFS.writeFile(destPath, asset.base64, 'base64');
    return fileUriForAbsolutePath(destPath);
  }

  const uri = asset.uri;
  if (uri?.startsWith('file://')) {
    const from = stripFileScheme(uri);
    await RNFS.copyFile(from, destPath);
    return fileUriForAbsolutePath(destPath);
  }

  if (uri) {
    return uri;
  }

  throw new Error('No receipt data');
}

export async function deleteStoredReceiptIfInAppDir(uri: string | undefined): Promise<void> {
  if (!uri?.trim()) {
    return;
  }
  const norm = stripFileScheme(uri.trim());
  const prefix = stripFileScheme(receiptsDirectoryPath());
  if (!norm.startsWith(prefix)) {
    return;
  }
  if (await RNFS.exists(norm)) {
    await RNFS.unlink(norm);
  }
}
