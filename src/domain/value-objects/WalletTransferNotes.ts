import type {Transaction, TransactionType} from '@domain/entities/Transaction';

export type WalletTransferLeg = 'source' | 'destination';

const TRANSFER_MARKER_LINE =
  /^\[WP_XFER:peer=([^:]+):leg=(source|destination)\]$/;

/**
 * Machine-readable first line links paired wallet-to-wallet transfers.
 * Optional user text is stored after a newline.
 */
export function buildWalletTransferNotes(
  peerTransactionId: string,
  leg: WalletTransferLeg,
  userNotes: string,
): string {
  const marker = `[WP_XFER:peer=${peerTransactionId}:leg=${leg}]`;
  const trimmed = userNotes.trim();
  return trimmed ? `${marker}\n${trimmed}` : marker;
}

export function parseWalletTransferMeta(
  notes: string,
): {peerId: string; leg: WalletTransferLeg} | null {
  const firstLine = (notes ?? '').split('\n')[0]?.trim() ?? '';
  const m = TRANSFER_MARKER_LINE.exec(firstLine);
  if (!m) {
    return null;
  }
  return {peerId: m[1], leg: m[2] as WalletTransferLeg};
}

/**
 * Signed cents impact on the wallet that owns this transaction.
 */
export function transactionLedgerDeltaCents(t: {
  type: TransactionType;
  amount: number;
  notes: string;
}): number {
  if (t.type === 'income') {
    return t.amount;
  }
  if (t.type === 'expense') {
    return -t.amount;
  }
  if (t.type === 'transfer') {
    const meta = parseWalletTransferMeta(t.notes);
    if (meta?.leg === 'destination') {
      return t.amount;
    }
    return -t.amount;
  }
  return -t.amount;
}

export function transactionLedgerDeltaCentsFromTransaction(t: Transaction): number {
  return transactionLedgerDeltaCents({
    type: t.type,
    amount: t.amount,
    notes: t.notes,
  });
}
