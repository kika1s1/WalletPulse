import {useState, useEffect, useCallback} from 'react';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';
import {
  getDefaultTemplates,
  createTemplate,
  type TransactionTemplate,
  type TemplateInput,
} from '@domain/usecases/quick-action-templates';

export function useTemplates() {
  const [userTemplates, setUserTemplates] = useState<TransactionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const ds = getSupabaseDataSource();
      const rows = await ds.templates.findAll();
      setUserTemplates(rows);
    } catch {
      // DB not available yet
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const allTemplates = [...getDefaultTemplates(), ...userTemplates];

  const addTemplate = useCallback(
    async (input: TemplateInput) => {
      const ds = getSupabaseDataSource();
      const template = createTemplate(input);
      await ds.templates.create(template);
      await fetch();
      return template;
    },
    [fetch],
  );

  const updateTemplate = useCallback(
    async (id: string, input: Partial<TemplateInput>) => {
      const ds = getSupabaseDataSource();
      await ds.templates.update(id, input);
      await fetch();
    },
    [fetch],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const ds = getSupabaseDataSource();
      await ds.templates.delete(id);
      await fetch();
    },
    [fetch],
  );

  const incrementUsage = useCallback(async (id: string) => {
    try {
      const ds = getSupabaseDataSource();
      await ds.templates.incrementUsageCount(id);
    } catch {
      // Non-critical
    }
  }, []);

  return {
    templates: allTemplates,
    userTemplates,
    defaultTemplates: getDefaultTemplates(),
    isLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    refetch: fetch,
  };
}
