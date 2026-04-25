import {UniversalSearchRepository} from '@data/repositories/UniversalSearchRepository';

const mockRpc = jest.fn();
const supabase = {rpc: mockRpc} as any;

beforeEach(() => {
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({data: [], error: null});
});

describe('UniversalSearchRepository', () => {
  it('passes the constructor userId to the RPC as p_user_id', async () => {
    const repo = new UniversalSearchRepository(supabase, 'user-123');

    await repo.search({query: 'pay'});

    expect(mockRpc).toHaveBeenCalledWith('search_everything', expect.objectContaining({
      p_query: 'pay',
      p_user_id: 'user-123',
    }));
  });

  it('serialises numeric date filters as JSON strings (RPC casts them to bigint)', async () => {
    const repo = new UniversalSearchRepository(supabase, 'user-123');

    await repo.search({
      query: '',
      filters: {startMs: 1775001600000, endMs: 1777679999999},
    });

    const args = mockRpc.mock.calls[0][1];
    expect(args.p_filters.startMs).toBe('1775001600000');
    expect(args.p_filters.endMs).toBe('1777679999999');
    expect(args.p_user_id).toBe('user-123');
  });

  it('throws when the RPC returns an error', async () => {
    mockRpc.mockResolvedValue({data: null, error: {message: 'boom'}});
    const repo = new UniversalSearchRepository(supabase, 'user-123');
    await expect(repo.search({query: 'x'})).rejects.toThrow('boom');
  });
});
