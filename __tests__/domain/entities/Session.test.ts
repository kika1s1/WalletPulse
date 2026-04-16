import {createSession, isSessionExpired, SESSION_DURATION_MS} from '@domain/entities/Session';

const now = 1_700_000_000_000;

describe('createSession', () => {
  it('creates a session with correct fields', () => {
    const session = createSession({
      id: 's-1',
      userId: 'u-1',
      token: 'tok-abc',
      createdAt: now,
    });
    expect(session.id).toBe('s-1');
    expect(session.userId).toBe('u-1');
    expect(session.token).toBe('tok-abc');
    expect(session.expiresAt).toBe(now + SESSION_DURATION_MS);
    expect(session.createdAt).toBe(now);
  });

  it('throws for empty id', () => {
    expect(() =>
      createSession({id: '', userId: 'u-1', token: 'tok', createdAt: now}),
    ).toThrow('Session id is required');
  });

  it('throws for empty userId', () => {
    expect(() =>
      createSession({id: 's-1', userId: '', token: 'tok', createdAt: now}),
    ).toThrow('User id is required');
  });

  it('throws for empty token', () => {
    expect(() =>
      createSession({id: 's-1', userId: 'u-1', token: '', createdAt: now}),
    ).toThrow('Token is required');
  });

  it('allows custom expiresAt', () => {
    const custom = now + 1000;
    const session = createSession({
      id: 's-1',
      userId: 'u-1',
      token: 'tok',
      createdAt: now,
      expiresAt: custom,
    });
    expect(session.expiresAt).toBe(custom);
  });
});

describe('isSessionExpired', () => {
  it('returns false for a fresh session', () => {
    const session = createSession({
      id: 's-1',
      userId: 'u-1',
      token: 'tok',
      createdAt: now,
    });
    expect(isSessionExpired(session, now + 1000)).toBe(false);
  });

  it('returns true when current time exceeds expiresAt', () => {
    const session = createSession({
      id: 's-1',
      userId: 'u-1',
      token: 'tok',
      createdAt: now,
    });
    expect(isSessionExpired(session, session.expiresAt + 1)).toBe(true);
  });

  it('returns true exactly at expiresAt boundary', () => {
    const session = createSession({
      id: 's-1',
      userId: 'u-1',
      token: 'tok',
      createdAt: now,
    });
    expect(isSessionExpired(session, session.expiresAt)).toBe(true);
  });
});
