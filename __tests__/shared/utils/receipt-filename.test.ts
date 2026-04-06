import {receiptFileExtensionFromMime} from '@shared/utils/receipt-filename';

describe('receiptFileExtensionFromMime', () => {
  it('defaults to jpg', () => {
    expect(receiptFileExtensionFromMime(undefined)).toBe('jpg');
    expect(receiptFileExtensionFromMime(null)).toBe('jpg');
    expect(receiptFileExtensionFromMime('')).toBe('jpg');
  });

  it('detects png and webp', () => {
    expect(receiptFileExtensionFromMime('image/png')).toBe('png');
    expect(receiptFileExtensionFromMime('IMAGE/PNG')).toBe('png');
    expect(receiptFileExtensionFromMime('image/webp')).toBe('webp');
  });

  it('uses jpg for other image types', () => {
    expect(receiptFileExtensionFromMime('image/jpeg')).toBe('jpg');
  });
});
