import type {RawNotification, ParsedNotification} from './types';
import type {DedupService} from './dedup-service';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {INotificationLogRepository} from '@domain/repositories/INotificationLogRepository';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import {getParserForPackage} from './parser-registry';
import {categorizeByMerchant} from './auto-categorize';
import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import type {Transaction, TransactionSource} from '@domain/entities/Transaction';
import {generateId} from '@shared/utils/hash';

export type OrchestratorDeps = {
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
  notificationLogRepo: INotificationLogRepository;
  categoryRepo: ICategoryRepository;
  dedupService: DedupService;
  getDefaultWalletId: () => Promise<string | null>;
};

export type OrchestratorResult = {
  status: 'created' | 'duplicate' | 'parse_failed' | 'no_parser' | 'no_wallet' | 'error';
  transaction?: Transaction;
  parsed?: ParsedNotification;
  error?: string;
};

type LogInput = {
  id: string;
  packageName: string;
  title: string;
  body: string;
  receivedAt: number;
  parsedSuccessfully: boolean;
  parseResult: string;
  transactionId?: string;
};

async function logNotification(
  repo: INotificationLogRepository,
  input: LogInput,
): Promise<void> {
  const now = Date.now();
  try {
    await repo.save({
      id: input.id,
      packageName: input.packageName,
      title: input.title,
      body: input.body,
      parsedSuccessfully: input.parsedSuccessfully,
      parseResult: input.parseResult,
      transactionId: input.transactionId,
      receivedAt: input.receivedAt,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // Logging failures must never break the main flow
  }
}

export function makeNotificationOrchestrator(deps: OrchestratorDeps) {
  const createTx = makeCreateTransaction({
    transactionRepo: deps.transactionRepo,
    walletRepo: deps.walletRepo,
  });

  return async function handleNotification(
    raw: RawNotification,
  ): Promise<OrchestratorResult> {
    const logId = generateId();

    const parser = getParserForPackage(raw.packageName);
    if (!parser) {
      await logNotification(deps.notificationLogRepo, {
        id: logId,
        packageName: raw.packageName,
        title: raw.title,
        body: raw.body,
        receivedAt: raw.receivedAt,
        parsedSuccessfully: false,
        parseResult: JSON.stringify({reason: 'no_parser'}),
      });
      return {status: 'no_parser'};
    }

    let parsed: ParsedNotification | null;
    try {
      parsed = parser(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logNotification(deps.notificationLogRepo, {
        id: logId,
        packageName: raw.packageName,
        title: raw.title,
        body: raw.body,
        receivedAt: raw.receivedAt,
        parsedSuccessfully: false,
        parseResult: JSON.stringify({reason: 'parse_error', error: msg}),
      });
      return {status: 'parse_failed', error: msg};
    }

    if (!parsed) {
      await logNotification(deps.notificationLogRepo, {
        id: logId,
        packageName: raw.packageName,
        title: raw.title,
        body: raw.body,
        receivedAt: raw.receivedAt,
        parsedSuccessfully: false,
        parseResult: JSON.stringify({reason: 'no_match'}),
      });
      return {status: 'parse_failed'};
    }

    const dedupResult = await deps.dedupService.isDuplicate(
      parsed.amountCents,
      parsed.currency,
      raw.receivedAt,
      parsed.source,
    );

    if (dedupResult.isDuplicate) {
      await logNotification(deps.notificationLogRepo, {
        id: logId,
        packageName: raw.packageName,
        title: raw.title,
        body: raw.body,
        receivedAt: raw.receivedAt,
        parsedSuccessfully: true,
        parseResult: JSON.stringify({...parsed, reason: 'duplicate', hash: dedupResult.hash}),
      });
      return {status: 'duplicate', parsed};
    }

    const walletId = await deps.getDefaultWalletId();
    if (!walletId) {
      await logNotification(deps.notificationLogRepo, {
        id: logId,
        packageName: raw.packageName,
        title: raw.title,
        body: raw.body,
        receivedAt: raw.receivedAt,
        parsedSuccessfully: true,
        parseResult: JSON.stringify({...parsed, reason: 'no_wallet'}),
      });
      return {status: 'no_wallet', parsed};
    }

    const categoryName = categorizeByMerchant(parsed.merchant);
    let categoryId = 'other';
    try {
      const catMatch = await deps.categoryRepo.findByName(categoryName);
      if (catMatch) {
        categoryId = catMatch.id;
      } else {
        const allCats = await deps.categoryRepo.findAll();
        const fallback = allCats.find(
          (c) => c.name.toLowerCase() === 'other',
        );
        if (fallback) categoryId = fallback.id;
      }
    } catch {
      // Category resolution failures are non-critical
    }

    const now = Date.now();

    try {
      const transaction = await createTx({
        id: generateId(),
        walletId,
        categoryId,
        amount: parsed.amountCents,
        currency: parsed.currency,
        type: parsed.type,
        description: parsed.description,
        merchant: parsed.merchant,
        source: parsed.source as TransactionSource,
        sourceHash: dedupResult.hash,
        tags: [],
        confidence: parsed.confidence,
        notes: `Auto-detected from ${raw.packageName}`,
        transactionDate: raw.receivedAt,
        createdAt: now,
        updatedAt: now,
      });

      deps.dedupService.markSeen(dedupResult.hash);

      await logNotification(deps.notificationLogRepo, {
        id: logId,
        packageName: raw.packageName,
        title: raw.title,
        body: raw.body,
        receivedAt: raw.receivedAt,
        parsedSuccessfully: true,
        parseResult: JSON.stringify(parsed),
        transactionId: transaction.id,
      });

      return {status: 'created', transaction, parsed};
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logNotification(deps.notificationLogRepo, {
        id: logId,
        packageName: raw.packageName,
        title: raw.title,
        body: raw.body,
        receivedAt: raw.receivedAt,
        parsedSuccessfully: true,
        parseResult: JSON.stringify({...parsed, reason: 'create_error', error: msg}),
      });
      return {status: 'error', parsed, error: msg};
    }
  };
}
