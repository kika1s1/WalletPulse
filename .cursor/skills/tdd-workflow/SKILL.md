---
name: tdd-workflow
description: Test-Driven Development workflow for WalletPulse. Guides writing tests first, implementing code second, and refactoring third. Use when creating any new feature, module, use case, parser, component, or fixing bugs.
---

# TDD Workflow Skill

## The Red-Green-Refactor Cycle

### Step 1: Red (Write a Failing Test)

Before writing any production code, create a test file that describes the expected behavior.

```ts
// __tests__/domain/usecases/create-transaction.test.ts
import { createTransaction } from '@domain/usecases/create-transaction';

describe('CreateTransaction', () => {
  it('should create a transaction with correct amount in cents', async () => {
    const mockRepo = { save: jest.fn().mockResolvedValue({ id: '123' }) };
    const result = await createTransaction(mockRepo, {
      amount: 2500,
      currency: 'USD',
      type: 'expense',
      categoryId: 'food',
      walletId: 'usd-wallet',
      description: 'Lunch',
    });
    expect(result.id).toBe('123');
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2500, currency: 'USD' })
    );
  });

  it('should reject negative amounts', async () => {
    const mockRepo = { save: jest.fn() };
    await expect(
      createTransaction(mockRepo, { amount: -100, currency: 'USD', type: 'expense', categoryId: 'food', walletId: 'w1', description: '' })
    ).rejects.toThrow('Amount must be positive');
  });
});
```

Run: `npm test -- --testPathPattern=create-transaction`  
Result: RED (file does not exist yet)

### Step 2: Green (Write Minimum Code)

Create the production file and write the simplest code to pass:

```ts
// src/domain/usecases/create-transaction.ts
import type { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

type CreateTransactionInput = {
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  categoryId: string;
  walletId: string;
  description: string;
};

export async function createTransaction(
  repo: ITransactionRepository,
  input: CreateTransactionInput,
) {
  if (input.amount <= 0) throw new Error('Amount must be positive');
  return repo.save({
    ...input,
    source: 'manual',
    merchant: '',
    transactionDate: Date.now(),
  });
}
```

Run tests again: GREEN

### Step 3: Refactor

Improve code quality while keeping all tests green:
- Extract validation into a separate function
- Add input sanitization
- Improve type safety

## When to Write Tests

| Scenario | Test First? |
|----------|-------------|
| New use case | Always |
| New parser | Always |
| New component | Always |
| Bug fix | Always (reproduce bug in test first) |
| Refactoring | Existing tests should cover; add more if gaps found |
| Styling changes | No (visual testing is manual) |

## Test Organization

Tests mirror the `src/` directory structure under `__tests__/`:

```
__tests__/domain/usecases/create-transaction.test.ts
    maps to
src/domain/usecases/create-transaction.ts
```

## Assertion Style

- Use `expect(...).toBe(...)` for primitives
- Use `expect(...).toEqual(...)` for objects
- Use `expect(...).toBeNull()` for null checks
- Use `expect(...).rejects.toThrow(...)` for async errors
- Avoid `toBeTruthy()` / `toBeFalsy()` (too vague)

## Mocking Strategy

- Domain layer: mock repository interfaces (simple objects with jest.fn())
- Data layer: use WatermelonDB test adapter for real DB operations
- Presentation: use @testing-library/react-native render + fireEvent
- Infrastructure: mock fetch for API calls, use fixtures for notifications
