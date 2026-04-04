import {createCategory, type CreateCategoryInput} from '@domain/entities/Category';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import {makeCreateCategory} from '@domain/usecases/create-category';

const base: CreateCategoryInput = {
  id: 'cat-1',
  name: 'Coffee',
  icon: 'coffee',
  color: '#8B4513',
  type: 'expense',
  isDefault: false,
  isArchived: false,
  sortOrder: 99,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function mockRepo(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findByType: jest.fn().mockResolvedValue([]),
    findDefaults: jest.fn().mockResolvedValue([]),
    findSubcategories: jest.fn().mockResolvedValue([]),
    findByName: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

describe('makeCreateCategory', () => {
  it('creates a valid category', async () => {
    const repo = mockRepo();
    const create = makeCreateCategory({categoryRepo: repo});
    const result = await create(base);

    expect(result.name).toBe('Coffee');
    expect(result.icon).toBe('coffee');
    expect(result.color).toBe('#8B4513');
    expect(result.type).toBe('expense');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate name', async () => {
    const repo = mockRepo();
    repo.findByName.mockResolvedValue(createCategory({...base, id: 'existing'}));
    const create = makeCreateCategory({categoryRepo: repo});

    await expect(create(base)).rejects.toThrow('A category with this name already exists');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('allows creating category with same name as archived one', async () => {
    const repo = mockRepo();
    repo.findByName.mockResolvedValue(createCategory({...base, id: 'old', isArchived: true}));
    const create = makeCreateCategory({categoryRepo: repo});
    const result = await create(base);

    expect(result.name).toBe('Coffee');
    expect(repo.save).toHaveBeenCalled();
  });

  it('validates empty name', async () => {
    const repo = mockRepo();
    const create = makeCreateCategory({categoryRepo: repo});

    await expect(create({...base, name: ''})).rejects.toThrow('Category name is required');
  });

  it('validates invalid type', async () => {
    const repo = mockRepo();
    const create = makeCreateCategory({categoryRepo: repo});

    await expect(create({...base, type: 'invalid' as any})).rejects.toThrow('Invalid category type');
  });

  it('preserves subcategory parentId', async () => {
    const repo = mockRepo();
    const create = makeCreateCategory({categoryRepo: repo});
    const result = await create({...base, parentId: 'parent-1'});

    expect(result.parentId).toBe('parent-1');
  });
});
