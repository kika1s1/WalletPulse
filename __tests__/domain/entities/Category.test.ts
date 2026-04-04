import {
  createCategory,
  hasType,
  isSubcategory,
  type CreateCategoryInput,
} from '@domain/entities/Category';

const baseInput: CreateCategoryInput = {
  id: 'c1',
  name: 'Food',
  icon: 'food',
  color: '#ff0000',
  type: 'expense',
  isDefault: false,
  isArchived: false,
  sortOrder: 1,
  createdAt: 1,
  updatedAt: 2,
};

describe('Category entity', () => {
  describe('createCategory', () => {
    it('creates a valid expense category', () => {
      const c = createCategory(baseInput);
      expect(c.name).toBe('Food');
      expect(c.type).toBe('expense');
      expect(c.parentId).toBeUndefined();
    });

    it('creates a valid income category', () => {
      const c = createCategory({...baseInput, id: 'c2', name: 'Salary', type: 'income'});
      expect(c.type).toBe('income');
    });

    it('creates a valid both category', () => {
      const c = createCategory({...baseInput, id: 'c3', name: 'General', type: 'both'});
      expect(c.type).toBe('both');
    });

    it('trims category name', () => {
      const c = createCategory({...baseInput, name: '  Transport  '});
      expect(c.name).toBe('Transport');
    });

    it('preserves optional parent id', () => {
      const c = createCategory({...baseInput, parentId: 'parent-1'});
      expect(c.parentId).toBe('parent-1');
    });

    it('rejects empty name', () => {
      expect(() => createCategory({...baseInput, name: ''})).toThrow(
        'Category name is required',
      );
    });

    it('rejects whitespace-only name', () => {
      expect(() => createCategory({...baseInput, name: '   '})).toThrow(
        'Category name is required',
      );
    });

    it('rejects invalid category type at runtime', () => {
      expect(() =>
        createCategory({...baseInput, type: 'savings' as CreateCategoryInput['type']}),
      ).toThrow('Invalid category type');
    });
  });

  describe('isSubcategory', () => {
    it('returns true when parentId is a non-empty string', () => {
      const c = createCategory({...baseInput, parentId: 'p1'});
      expect(isSubcategory(c)).toBe(true);
    });

    it('returns false when parentId is undefined', () => {
      const c = createCategory(baseInput);
      expect(isSubcategory(c)).toBe(false);
    });

    it('returns false when parentId is empty string', () => {
      const c = createCategory({...baseInput, parentId: ''});
      expect(isSubcategory(c)).toBe(false);
    });
  });

  describe('hasType', () => {
    it('returns true when category type matches', () => {
      const expense = createCategory(baseInput);
      expect(hasType(expense, 'expense')).toBe(true);
      expect(hasType(expense, 'income')).toBe(false);
    });

    it('returns true for both when asking expense or income', () => {
      const both = createCategory({...baseInput, type: 'both'});
      expect(hasType(both, 'expense')).toBe(true);
      expect(hasType(both, 'income')).toBe(true);
    });
  });
});
