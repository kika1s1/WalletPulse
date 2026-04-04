import {createCategory, type CreateCategoryInput} from '@domain/entities/Category';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import {makeUpdateCategory} from '@domain/usecases/update-category';

const base: CreateCategoryInput = {
  id: 'cat-u1',
  name: 'Travel',
  icon: 'airplane',
  color: '#FD79A8',
  type: 'expense',
  isDefault: false,
  isArchived: false,
  sortOrder: 5,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function mockRepo(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findByType: jest.fn().mockResolvedValue([]),
    findDefaults: jest.fn().mockResolvedValue([]),
    findSubcategories: jest.fn().mockResolvedValue([]),
    findByName: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn(),
    delete: jest.fn(),
  };
}

describe('makeUpdateCategory', () => {
  it('updates an existing category', async () => {
    const repo = mockRepo();
    const existing = createCategory(base);
    repo.findById.mockResolvedValue(existing);
    const update = makeUpdateCategory({categoryRepo: repo});

    const result = await update({...existing, name: 'Travel Updated', color: '#FF0000'});

    expect(result.name).toBe('Travel Updated');
    expect(result.color).toBe('#FF0000');
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('throws when category not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    const update = makeUpdateCategory({categoryRepo: repo});
    const cat = createCategory(base);

    await expect(update(cat)).rejects.toThrow('Category not found');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects duplicate name when renaming', async () => {
    const repo = mockRepo();
    const existing = createCategory(base);
    repo.findById.mockResolvedValue(existing);
    repo.findByName.mockResolvedValue(createCategory({...base, id: 'other', name: 'Food'}));
    const update = makeUpdateCategory({categoryRepo: repo});

    await expect(update({...existing, name: 'Food'})).rejects.toThrow(
      'A category with this name already exists',
    );
  });

  it('allows updating without changing name', async () => {
    const repo = mockRepo();
    const existing = createCategory(base);
    repo.findById.mockResolvedValue(existing);
    const update = makeUpdateCategory({categoryRepo: repo});

    const result = await update({...existing, icon: 'plane'});

    expect(result.icon).toBe('plane');
    expect(result.name).toBe('Travel');
    expect(repo.update).toHaveBeenCalled();
  });

  it('sets updatedAt timestamp', async () => {
    const repo = mockRepo();
    const existing = createCategory(base);
    repo.findById.mockResolvedValue(existing);
    const before = Date.now();
    const update = makeUpdateCategory({categoryRepo: repo});
    const result = await update(existing);

    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
  });
});
