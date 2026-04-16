export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type Session = {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
};

export type CreateSessionInput = {
  id: string;
  userId: string;
  token: string;
  createdAt: number;
  expiresAt?: number;
};

export function createSession(input: CreateSessionInput): Session {
  if (!input.id.trim()) {
    throw new Error('Session id is required');
  }
  if (!input.userId.trim()) {
    throw new Error('User id is required');
  }
  if (!input.token.trim()) {
    throw new Error('Token is required');
  }

  return {
    id: input.id,
    userId: input.userId,
    token: input.token,
    expiresAt: input.expiresAt ?? input.createdAt + SESSION_DURATION_MS,
    createdAt: input.createdAt,
  };
}

export function isSessionExpired(session: Session, nowMs: number = Date.now()): boolean {
  return nowMs >= session.expiresAt;
}
