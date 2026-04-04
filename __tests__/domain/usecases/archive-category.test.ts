import {createCategory, type CreateCategoryInput} from '@domain/entities/Category';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import {makeArchiveCategory} from '@domain/usecases/archive-category';

const base: CreateCategoryInput = {
  id: 'cat-a1',
  name: 'Custom Cat',
  icon: 'star',
  color: '#FF0000',
  type: 'expense',
  isDefault: false,
  isArchived: false,
  sortOrder: 10,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function mockRepo(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByType: jest.fn(),
    findDefaults: jest.fn(),
    findSubcategories: jest.fn(),
    findByName: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    archive: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn(),
  };
}

describe('makeArchiveCategory', () => {
  it('archives a custom category', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(createCategory(base));
    const archive = makeArchiveCategory({categoryRepo: repo});

    await archive('cat-a1');

    expect(repo.archive).toHaveBeenCalledWith('cat-a1');
  });

  it('throws when category not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    const archive = makeArchiveCategory({categoryRepo: repo});

    await expect(archive('missing')).rejects.toThrow('Category not found');
    expect(repo.archive).not.toHaveBeenCalled();
  });

  it('rejects archiving default categories', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(createCategory({...base, isDefault: true}));
    const archive = makeArchiveCategory({categoryRepo: repo});

    await expect(archive('cat-a1')).rejects.toThrow('Default categories cannot be archived');
    expect(repo.archive).not.toHaveBeenCalled();
  });
});
