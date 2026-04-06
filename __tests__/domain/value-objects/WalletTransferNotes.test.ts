import {
  buildWalletTransferNotes,
  parseWalletTransferMeta,
  transactionLedgerDeltaCents,
} from '@domain/value-objects/WalletTransferNotes';

describe('WalletTransferNotes', () => {
  it('builds marker-only notes and parses peer and leg', () => {
    const n = buildWalletTransferNotes('peer-id-1', 'source', '');
    expect(n).toBe('[WP_XFER:peer=peer-id-1:leg=source]');
    expect(parseWalletTransferMeta(n)).toEqual({peerId: 'peer-id-1', leg: 'source'});
  });

  it('appends user notes after a newline', () => {
    const n = buildWalletTransferNotes('b', 'destination', '  memo line  ');
    expect(n).toBe('[WP_XFER:peer=b:leg=destination]\nmemo line');
    expect(parseWalletTransferMeta(n)).toEqual({peerId: 'b', leg: 'destination'});
  });

  it('returns null when notes have no marker', () => {
    expect(parseWalletTransferMeta('hello')).toBeNull();
    expect(parseWalletTransferMeta('')).toBeNull();
  });

  it('ledger delta: destination transfer adds, source subtracts, legacy transfer subtracts', () => {
    expect(
      transactionLedgerDeltaCents({
        type: 'transfer',
        amount: 100,
        notes: buildWalletTransferNotes('x', 'source', ''),
      }),
    ).toBe(-100);
    expect(
      transactionLedgerDeltaCents({
        type: 'transfer',
        amount: 100,
        notes: buildWalletTransferNotes('x', 'destination', ''),
      }),
    ).toBe(100);
    expect(
      transactionLedgerDeltaCents({
        type: 'transfer',
        amount: 100,
        notes: '',
      }),
    ).toBe(-100);
  });
});
