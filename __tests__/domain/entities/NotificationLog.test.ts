import {
  createNotificationLog,
  getParseResultObject,
  wasCreatedAsTransaction,
} from '@domain/entities/NotificationLog';

const baseInput = {
  id: 'nl-1',
  packageName: 'com.example.bank',
  title: 'Payment',
  body: 'You paid 10.00 USD',
  parsedSuccessfully: true,
  parseResult: '{"amountCents":1000}',
  receivedAt: 1_700_000_000_000,
  createdAt: 1,
  updatedAt: 1,
};

describe('NotificationLog entity', () => {
  describe('createNotificationLog', () => {
    it('creates a valid log', () => {
      const n = createNotificationLog(baseInput);
      expect(n.packageName).toBe('com.example.bank');
      expect(n.body).toBe('You paid 10.00 USD');
    });

    it('rejects an empty packageName', () => {
      expect(() => createNotificationLog({...baseInput, packageName: '  '})).toThrow(
        'packageName must not be empty',
      );
    });
  });

  describe('wasCreatedAsTransaction', () => {
    it('returns true when parsed successfully and transaction id is set', () => {
      const n = createNotificationLog({...baseInput, transactionId: 'tx-1'});
      expect(wasCreatedAsTransaction(n)).toBe(true);
    });

    it('returns false when parse failed', () => {
      const n = createNotificationLog({...baseInput, parsedSuccessfully: false, transactionId: 'tx-1'});
      expect(wasCreatedAsTransaction(n)).toBe(false);
    });

    it('returns false when no transaction id', () => {
      const n = createNotificationLog({...baseInput, parsedSuccessfully: true});
      expect(wasCreatedAsTransaction(n)).toBe(false);
    });
  });

  describe('getParseResultObject', () => {
    it('parses valid JSON', () => {
      const n = createNotificationLog(baseInput);
      expect(getParseResultObject(n)).toEqual({amountCents: 1000});
    });

    it('returns null for invalid JSON', () => {
      const n = createNotificationLog({...baseInput, parseResult: 'not-json{'});
      expect(getParseResultObject(n)).toBeNull();
    });
  });
});
