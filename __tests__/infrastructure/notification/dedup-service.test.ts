import {createDedupService, type DedupService} from '@infrastructure/notification/dedup-service';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';

function mockRepo(): jest.Mocked<Pick<ITransactionRepository, 'findBySourceHash'>> {
  return {findBySourceHash: jest.fn()};
}

describe('DedupService', () => {
  let service: DedupService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(() => {
    repo = mockRepo();
    service = createDedupService(repo as unknown as ITransactionRepository);
  });

  it('detects new hash as non-duplicate', async () => {
    repo.findBySourceHash.mockResolvedValue(null);
    const r = await service.isDuplicate(10000, 'USD', Date.now(), 'payoneer');
    expect(r.isDuplicate).toBe(false);
    expect(r.hash).toBeTruthy();
  });

  it('detects DB-persisted hash as duplicate', async () => {
    repo.findBySourceHash.mockResolvedValue({id: 'tx-1'} as any);
    const r = await service.isDuplicate(10000, 'USD', Date.now(), 'payoneer');
    expect(r.isDuplicate).toBe(true);
  });

  it('detects in-memory cached hash without DB call', async () => {
    repo.findBySourceHash.mockResolvedValue(null);
    const ts = Date.now();
    const first = await service.isDuplicate(5000, 'EUR', ts, 'grey');
    expect(first.isDuplicate).toBe(false);
    service.markSeen(first.hash);
    const second = await service.isDuplicate(5000, 'EUR', ts, 'grey');
    expect(second.isDuplicate).toBe(true);
    expect(repo.findBySourceHash).toHaveBeenCalledTimes(1);
  });

  it('generates different hashes for different amounts', async () => {
    repo.findBySourceHash.mockResolvedValue(null);
    const ts = Date.now();
    const r1 = await service.isDuplicate(100, 'USD', ts, 'payoneer');
    const r2 = await service.isDuplicate(200, 'USD', ts, 'payoneer');
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('generates different hashes for different currencies', async () => {
    repo.findBySourceHash.mockResolvedValue(null);
    const ts = Date.now();
    const r1 = await service.isDuplicate(100, 'USD', ts, 'payoneer');
    const r2 = await service.isDuplicate(100, 'EUR', ts, 'payoneer');
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('generates different hashes for different sources', async () => {
    repo.findBySourceHash.mockResolvedValue(null);
    const ts = Date.now();
    const r1 = await service.isDuplicate(100, 'USD', ts, 'payoneer');
    const r2 = await service.isDuplicate(100, 'USD', ts, 'grey');
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('uses minute-floored timestamp for dedup window', async () => {
    repo.findBySourceHash.mockResolvedValue(null);
    const base = 1700000000000;
    const r1 = await service.isDuplicate(100, 'USD', base, 'payoneer');
    const r2 = await service.isDuplicate(100, 'USD', base + 30000, 'payoneer');
    expect(r1.hash).toBe(r2.hash);
  });

  it('evicts oldest hashes when cache is full', async () => {
    repo.findBySourceHash.mockResolvedValue(null);
    const small = createDedupService(repo as unknown as ITransactionRepository, 5);
    const ts = Date.now();
    for (let i = 0; i < 6; i++) {
      const r = await small.isDuplicate(i * 100 + 100, 'USD', ts, 'payoneer');
      small.markSeen(r.hash);
    }
    repo.findBySourceHash.mockClear();
    await small.isDuplicate(100, 'USD', ts, 'payoneer');
    expect(repo.findBySourceHash).toHaveBeenCalled();
  });
});
