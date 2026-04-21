import {createCategory} from '@domain/entities/Category';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import {makeReorderCategories} from '@domain/usecases/reorder-categories';

const now = Date.now();

function makeCat(id: string, order: number): ReturnType<typeof createCategory> {
  return createCategory({
    id,
    name: `Cat ${id}`,
    icon: 'star',
    color: '#000',
    type: 'expense',
    isDefault: false,
    isArchived: false,
    sortOrder: order,
    createdAt: now,
    updatedAt: now,
  });
}

function mockRepo(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByType: jest.fn(),
    findDefaults: jest.fn(),
    findSubcategories: jest.fn(),
    findByName: jest.fn(),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn(),
    delete: jest.fn(),
  };
}

describe('makeReorderCategories', () => {
  it('reorders categories by new index positions', async () => {
    const repo = mockRepo();
    const cats = [makeCat('a', 0), makeCat('b', 1), makeCat('c', 2)];
    repo.findAll.mockResolvedValue(cats);

    const reorder = makeReorderCategories({categoryRepo: repo});
    await reorder(['c', 'a', 'b']);

    expect(repo.update).toHaveBeenCalledTimes(3);
    const calls = repo.update.mock.calls.map((c) => ({id: c[0].id, order: c[0].sortOrder}));
    expect(calls).toEqual(
      expect.arrayContaining([
        {id: 'c', order: 0},
        {id: 'a', order: 1},
        {id: 'b', order: 2},
      ]),
    );
  });

  it('skips categories already in correct position', async () => {
    const repo = mockRepo();
    const cats = [makeCat('a', 0), makeCat('b', 1)];
    repo.findAll.mockResolvedValue(cats);

    const reorder = makeReorderCategories({categoryRepo: repo});
    await reorder(['a', 'b']);

    expect(repo.update).not.toHaveBeenCalled();
  });

  it('ignores unknown ids gracefully', async () => {
    const repo = mockRepo();
    repo.findAll.mockResolvedValue([makeCat('a', 0)]);

    const reorder = makeReorderCategories({categoryRepo: repo});
    await reorder(['a', 'unknown']);

    expect(repo.update).not.toHaveBeenCalled();
  });
});
