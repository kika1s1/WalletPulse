export type User = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  createdAt: number;
  updatedAt: number;
};

export type CreateUserInput = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createUser(input: CreateUserInput): User {
  if (!input.id.trim()) {
    throw new Error('User id is required');
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Email is required');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Invalid email format');
  }

  return {
    id: input.id,
    email,
    fullName: input.fullName.trim(),
    avatarUrl: input.avatarUrl ?? '',
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
