import {useCallback, useEffect, useState} from 'react';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {createTag} from '@domain/entities/Tag';
import {
  collectAllTags,
  mergeUniqueSortedTagNames,
  normalizeTag,
  validateTag,
} from '@domain/usecases/tag-management';
import {generateId} from '@shared/utils/hash';

export function useTagSuggestions() {
  const [allKnownTags, setAllKnownTags] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const ds = getLocalDataSource();
    const transactions = await ds.transactions.findAll();
    let tableTags = await ds.tags.findAll();

    if (tableTags.length === 0) {
      const fromTxns = collectAllTags(transactions);
      if (fromTxns.length > 0) {
        const now = Date.now();
        for (const name of fromTxns) {
          const normalized = normalizeTag(name);
          if (validateTag(normalized) !== null) {
            continue;
          }
          const existing = await ds.tags.findByName(normalized);
          if (existing) {
            continue;
          }
          await ds.tags.save(
            createTag({
              id: generateId(),
              name: normalized,
              color: '',
              usageCount: 0,
              createdAt: now,
              updatedAt: now,
            }),
          );
        }
        tableTags = await ds.tags.findAll();
      }
    }

    const merged = mergeUniqueSortedTagNames(
      tableTags.map((t) => t.name),
      collectAllTags(transactions),
    );
    setAllKnownTags(merged);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persistNewTag = useCallback(
    async (rawName: string) => {
      const normalized = normalizeTag(rawName);
      if (!normalized || validateTag(normalized) !== null) {
        return;
      }
      const ds = getLocalDataSource();
      const existing = await ds.tags.findByName(normalized);
      if (existing) {
        return;
      }
      const now = Date.now();
      await ds.tags.save(
        createTag({
          id: generateId(),
          name: normalized,
          color: '',
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        }),
      );
      await refresh();
    },
    [refresh],
  );

  return {allKnownTags, refresh, persistNewTag};
}
