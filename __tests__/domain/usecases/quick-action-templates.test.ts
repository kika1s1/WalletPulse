import {
  createTemplate,
  applyTemplate,
  validateTemplate,
  getDefaultTemplates,
  type TransactionTemplate,
} from '@domain/usecases/quick-action-templates';

describe('quick-action-templates', () => {
  describe('getDefaultTemplates', () => {
    it('returns a non-empty array of templates', () => {
      const templates = getDefaultTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('each template has required fields', () => {
      for (const t of getDefaultTemplates()) {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.icon).toBeTruthy();
        expect(t.color).toBeTruthy();
        expect(['expense', 'income', 'transfer']).toContain(t.type);
      }
    });
  });

  describe('createTemplate', () => {
    it('creates a template with given values', () => {
      const t = createTemplate({
        name: 'Coffee',
        icon: 'C',
        color: '#FF6B6B',
        type: 'expense',
        categoryId: 'food-and-dining',
        amount: 350,
        currency: 'USD',
        description: 'Morning coffee',
        merchant: 'Starbucks',
      });
      expect(t.id).toBeTruthy();
      expect(t.name).toBe('Coffee');
      expect(t.amount).toBe(350);
      expect(t.currency).toBe('USD');
    });

    it('auto-generates id and timestamps', () => {
      const t = createTemplate({
        name: 'Test',
        icon: 'T',
        color: '#000',
        type: 'expense',
      });
      expect(t.id).toBeTruthy();
      expect(t.createdAt).toBeGreaterThan(0);
    });
  });

  describe('applyTemplate', () => {
    it('converts template to a partial transaction input', () => {
      const template: TransactionTemplate = {
        id: 'tpl-1',
        name: 'Lunch',
        icon: 'L',
        color: '#FF6B6B',
        type: 'expense',
        categoryId: 'food-and-dining',
        amount: 1200,
        currency: 'USD',
        description: 'Team lunch',
        merchant: 'Restaurant',
        tags: ['team'],
        sortOrder: 0,
        createdAt: Date.now(),
      };
      const input = applyTemplate(template);
      expect(input.type).toBe('expense');
      expect(input.categoryId).toBe('food-and-dining');
      expect(input.amount).toBe(1200);
      expect(input.currency).toBe('USD');
      expect(input.description).toBe('Team lunch');
      expect(input.merchant).toBe('Restaurant');
      expect(input.tags).toEqual(['team']);
    });

    it('uses defaults for missing optional fields', () => {
      const template: TransactionTemplate = {
        id: 'tpl-2',
        name: 'Quick',
        icon: 'Q',
        color: '#000',
        type: 'income',
        sortOrder: 0,
        createdAt: Date.now(),
      };
      const input = applyTemplate(template);
      expect(input.type).toBe('income');
      expect(input.amount).toBe(0);
      expect(input.currency).toBe('');
      expect(input.description).toBe('');
      expect(input.tags).toEqual([]);
    });
  });

  describe('validateTemplate', () => {
    it('passes for valid template', () => {
      expect(
        validateTemplate({name: 'Coffee', icon: 'C', color: '#FF6B6B', type: 'expense'}),
      ).toBeNull();
    });

    it('rejects empty name', () => {
      expect(
        validateTemplate({name: '', icon: 'C', color: '#FF6B6B', type: 'expense'}),
      ).toBe('Template name is required');
    });

    it('rejects name over 40 characters', () => {
      expect(
        validateTemplate({name: 'a'.repeat(41), icon: 'C', color: '#FF6B6B', type: 'expense'}),
      ).toBe('Template name must be 40 characters or fewer');
    });

    it('rejects empty icon', () => {
      expect(
        validateTemplate({name: 'Test', icon: '', color: '#FF6B6B', type: 'expense'}),
      ).toBe('Icon is required');
    });
  });
});
