import {createUser, type CreateUserInput} from '@domain/entities/User';

const validInput: CreateUserInput = {
  id: 'u-1',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: '',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

describe('createUser', () => {
  it('creates a user from valid input', () => {
    const user = createUser(validInput);
    expect(user.id).toBe('u-1');
    expect(user.email).toBe('test@example.com');
    expect(user.fullName).toBe('Test User');
    expect(user.avatarUrl).toBe('');
    expect(user.address).toBe('');
  });

  it('trims and lowercases email', () => {
    const user = createUser({...validInput, email: '  Test@Example.COM  '});
    expect(user.email).toBe('test@example.com');
  });

  it('trims full name', () => {
    const user = createUser({...validInput, fullName: '  John Doe  '});
    expect(user.fullName).toBe('John Doe');
  });

  it('throws for empty email', () => {
    expect(() => createUser({...validInput, email: ''})).toThrow('Email is required');
  });

  it('throws for invalid email format', () => {
    expect(() => createUser({...validInput, email: 'not-an-email'})).toThrow(
      'Invalid email format',
    );
  });

  it('throws for email without domain', () => {
    expect(() => createUser({...validInput, email: 'user@'})).toThrow(
      'Invalid email format',
    );
  });

  it('throws for empty id', () => {
    expect(() => createUser({...validInput, id: ''})).toThrow('User id is required');
  });

  it('defaults avatarUrl to empty string', () => {
    const {avatarUrl, ...rest} = validInput;
    const user = createUser({...rest, avatarUrl: undefined} as CreateUserInput);
    expect(user.avatarUrl).toBe('');
  });

  it('defaults address to empty string', () => {
    const user = createUser(validInput);
    expect(user.address).toBe('');
  });

  it('stores and trims address when provided', () => {
    const user = createUser({...validInput, address: '  123 Main St\nLagos, Nigeria  '});
    expect(user.address).toBe('123 Main St\nLagos, Nigeria');
  });
});
