export type Receipt = {
  readonly id: string;
  readonly uri: string;
  readonly transactionId: string;
  readonly note: string;
  readonly createdAt: number;
};

export type CreateReceiptInput = {
  uri: string;
  transactionId: string;
  note?: string;
};

let _counter = 0;

export function createReceipt(input: CreateReceiptInput): Receipt {
  _counter += 1;
  return {
    id: `receipt-${Date.now()}-${_counter}`,
    uri: input.uri,
    transactionId: input.transactionId,
    note: input.note ?? '',
    createdAt: Date.now(),
  };
}

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic', 'webp']);

export function validateReceiptImage(path: string): string | null {
  if (!path.trim()) {
    return 'Image path is required';
  }
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'Unsupported image format. Use JPG or PNG.';
  }
  return null;
}

export function linkReceiptToTransaction(receipt: Receipt, transactionId: string): Receipt {
  return {...receipt, transactionId};
}

export function unlinkReceipt(receipt: Receipt): Receipt {
  return {...receipt, transactionId: ''};
}

export function getReceiptsByTransaction(receipts: Receipt[], transactionId: string): Receipt[] {
  return receipts.filter((r) => r.transactionId === transactionId);
}

export function generateReceiptFilename(transactionId: string): string {
  return `receipt-${transactionId}-${Date.now()}.jpg`;
}
