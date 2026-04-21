import {useState, useEffect, useCallback} from 'react';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';
import type {ParsingRule, CreateParsingRuleInput} from '@domain/entities/ParsingRule';

export function useParsingRules() {
  const [rules, setRules] = useState<ParsingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ds = getSupabaseDataSource();
      const rows = await ds.parsingRules.findAll();
      setRules(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const addRule = useCallback(
    async (input: CreateParsingRuleInput) => {
      const ds = getSupabaseDataSource();
      await ds.parsingRules.create(input);
      await loadRules();
    },
    [loadRules],
  );

  const updateRule = useCallback(
    async (id: string, input: Partial<CreateParsingRuleInput>) => {
      const ds = getSupabaseDataSource();
      await ds.parsingRules.update(id, input);
      await loadRules();
    },
    [loadRules],
  );

  const deleteRule = useCallback(
    async (id: string) => {
      const ds = getSupabaseDataSource();
      await ds.parsingRules.delete(id);
      await loadRules();
    },
    [loadRules],
  );

  const toggleRule = useCallback(
    async (id: string, isActive: boolean) => {
      const ds = getSupabaseDataSource();
      await ds.parsingRules.update(id, {isActive});
      await loadRules();
    },
    [loadRules],
  );

  return {
    rules,
    isLoading,
    error,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    refetch: loadRules,
  };
}
