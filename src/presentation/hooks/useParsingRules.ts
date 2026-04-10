import {useState, useEffect, useCallback} from 'react';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import type {ParsingRule, CreateParsingRuleInput} from '@domain/entities/ParsingRule';

export function useParsingRules() {
  const [rules, setRules] = useState<ParsingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const ds = getLocalDataSource();
      const rows = await ds.parsingRules.findAll();
      setRules(rows);
    } catch {
      // DB not available
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const addRule = useCallback(
    async (input: CreateParsingRuleInput) => {
      const ds = getLocalDataSource();
      await ds.parsingRules.create(input);
      await loadRules();
    },
    [loadRules],
  );

  const updateRule = useCallback(
    async (id: string, input: Partial<CreateParsingRuleInput>) => {
      const ds = getLocalDataSource();
      await ds.parsingRules.update(id, input);
      await loadRules();
    },
    [loadRules],
  );

  const deleteRule = useCallback(
    async (id: string) => {
      const ds = getLocalDataSource();
      await ds.parsingRules.delete(id);
      await loadRules();
    },
    [loadRules],
  );

  const toggleRule = useCallback(
    async (id: string, isActive: boolean) => {
      const ds = getLocalDataSource();
      await ds.parsingRules.update(id, {isActive});
      await loadRules();
    },
    [loadRules],
  );

  return {
    rules,
    isLoading,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    refetch: loadRules,
  };
}
