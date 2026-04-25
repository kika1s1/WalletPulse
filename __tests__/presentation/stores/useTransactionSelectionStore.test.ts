import {useTransactionSelectionStore} from '@presentation/stores/useTransactionSelectionStore';

describe('useTransactionSelectionStore', () => {
  beforeEach(() => {
    useTransactionSelectionStore.getState().clearSelection();
  });

  it('enters selection mode when a transaction is selected', () => {
    useTransactionSelectionStore.getState().toggleSelected('txn-1');

    expect(useTransactionSelectionStore.getState().isSelecting).toBe(true);
    expect(useTransactionSelectionStore.getState().selectedIds).toEqual(['txn-1']);
  });

  it('selects visible ids without duplicating existing selections', () => {
    useTransactionSelectionStore.getState().toggleSelected('txn-1');
    useTransactionSelectionStore.getState().selectVisible(['txn-1', 'txn-2']);

    expect(useTransactionSelectionStore.getState().selectedIds).toEqual(['txn-1', 'txn-2']);
  });

  it('clears selection mode when the last selected transaction is toggled off', () => {
    useTransactionSelectionStore.getState().toggleSelected('txn-1');
    useTransactionSelectionStore.getState().toggleSelected('txn-1');

    expect(useTransactionSelectionStore.getState().isSelecting).toBe(false);
    expect(useTransactionSelectionStore.getState().selectedIds).toEqual([]);
  });
});
