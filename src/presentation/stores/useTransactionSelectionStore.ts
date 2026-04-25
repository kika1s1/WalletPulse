import {create} from 'zustand';

type TransactionSelectionState = {
  selectedIds: string[];
  isSelecting: boolean;
  selectedCount: number;
  enterSelectionMode: () => void;
  toggleSelected: (id: string) => void;
  selectVisible: (ids: string[]) => void;
  clearSelection: () => void;
};

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function buildState(ids: string[]): Pick<TransactionSelectionState, 'selectedIds' | 'isSelecting' | 'selectedCount'> {
  const selectedIds = uniqueIds(ids);
  return {
    selectedIds,
    isSelecting: selectedIds.length > 0,
    selectedCount: selectedIds.length,
  };
}

export const useTransactionSelectionStore = create<TransactionSelectionState>((set) => ({
  selectedIds: [],
  isSelecting: false,
  selectedCount: 0,
  enterSelectionMode: () => set({isSelecting: true}),
  toggleSelected: (id) => set((state) => {
    const selected = new Set(state.selectedIds);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    return buildState([...selected]);
  }),
  selectVisible: (ids) => set((state) => buildState([...state.selectedIds, ...ids])),
  clearSelection: () => set({selectedIds: [], isSelecting: false, selectedCount: 0}),
}));
