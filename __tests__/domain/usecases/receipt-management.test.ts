import {
  type Receipt,
  createReceipt,
  validateReceiptImage,
  linkReceiptToTransaction,
  unlinkReceipt,
  getReceiptsByTransaction,
  generateReceiptFilename,
} from '@domain/usecases/receipt-management';

const now = Date.now();

describe('receipt-management', () => {
  describe('createReceipt', () => {
    it('creates a receipt with all fields', () => {
      const receipt = createReceipt({
        uri: 'file:///photos/receipt.jpg',
        transactionId: 'txn-1',
      });
      expect(receipt.id).toBeDefined();
      expect(receipt.uri).toBe('file:///photos/receipt.jpg');
      expect(receipt.transactionId).toBe('txn-1');
      expect(receipt.createdAt).toBeDefined();
    });

    it('generates unique ids', () => {
      const r1 = createReceipt({uri: 'a.jpg', transactionId: 't1'});
      const r2 = createReceipt({uri: 'b.jpg', transactionId: 't2'});
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe('validateReceiptImage', () => {
    it('accepts jpg extension', () => {
      expect(validateReceiptImage('photo.jpg')).toBeNull();
    });

    it('accepts jpeg extension', () => {
      expect(validateReceiptImage('photo.jpeg')).toBeNull();
    });

    it('accepts png extension', () => {
      expect(validateReceiptImage('photo.png')).toBeNull();
    });

    it('rejects unsupported extensions', () => {
      expect(validateReceiptImage('doc.pdf')).toBe('Unsupported image format. Use JPG or PNG.');
    });

    it('rejects empty path', () => {
      expect(validateReceiptImage('')).toBe('Image path is required');
    });

    it('handles case-insensitive extensions', () => {
      expect(validateReceiptImage('photo.JPG')).toBeNull();
      expect(validateReceiptImage('photo.PNG')).toBeNull();
    });
  });

  describe('linkReceiptToTransaction', () => {
    it('links receipt to a transaction', () => {
      const receipt: Receipt = {
        id: 'r1',
        uri: 'photo.jpg',
        transactionId: '',
        note: '',
        createdAt: now,
      };
      const linked = linkReceiptToTransaction(receipt, 'txn-5');
      expect(linked.transactionId).toBe('txn-5');
      expect(linked.id).toBe('r1');
    });
  });

  describe('unlinkReceipt', () => {
    it('clears the transaction association', () => {
      const receipt: Receipt = {
        id: 'r1',
        uri: 'photo.jpg',
        transactionId: 'txn-5',
        note: '',
        createdAt: now,
      };
      const unlinked = unlinkReceipt(receipt);
      expect(unlinked.transactionId).toBe('');
    });
  });

  describe('getReceiptsByTransaction', () => {
    it('filters receipts by transactionId', () => {
      const receipts: Receipt[] = [
        {id: 'r1', uri: 'a.jpg', transactionId: 'txn-1', note: '', createdAt: now},
        {id: 'r2', uri: 'b.jpg', transactionId: 'txn-2', note: '', createdAt: now},
        {id: 'r3', uri: 'c.jpg', transactionId: 'txn-1', note: '', createdAt: now},
      ];
      const filtered = getReceiptsByTransaction(receipts, 'txn-1');
      expect(filtered.length).toBe(2);
    });
  });

  describe('generateReceiptFilename', () => {
    it('generates filename with transaction id and timestamp', () => {
      const name = generateReceiptFilename('txn-1');
      expect(name).toMatch(/^receipt-txn-1-\d+\.jpg$/);
    });
  });
});
