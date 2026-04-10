import type {Database} from '@nozbe/watermelondb';
import * as RNFS from '@dr.pogodin/react-native-fs';

import database from '@data/database';
import dbSchema from '@data/database/schema';
import type AppSettingsModel from '@data/database/models/AppSettingsModel';
import type BillReminderModel from '@data/database/models/BillReminderModel';
import type BudgetModel from '@data/database/models/BudgetModel';
import type CategoryModel from '@data/database/models/CategoryModel';
import type GoalModel from '@data/database/models/GoalModel';
import type SubscriptionModel from '@data/database/models/SubscriptionModel';
import type TagModel from '@data/database/models/TagModel';
import type TransactionModel from '@data/database/models/TransactionModel';
import type FxRateModel from '@data/database/models/FxRateModel';
import type NotificationLogModel from '@data/database/models/NotificationLogModel';
import type ParsingRuleModel from '@data/database/models/ParsingRuleModel';
import type TransactionTemplateModel from '@data/database/models/TransactionTemplateModel';
import type WalletModel from '@data/database/models/WalletModel';
import {APP_NAME, APP_VERSION} from '@shared/constants/app';

export const WALLET_PULSE_BACKUP_FORMAT_VERSION = 2;

const BACKUP_FILE_PREFIX = 'WalletPulse-backup-';
const BATCH_CHUNK_SIZE = 200;

export type BackupFileInfo = {
  path: string;
  name: string;
  mtime: number;
  size: number;
};

export type RestoreBackupResult =
  | {ok: true}
  | {ok: false; error: string};

type UnknownRecord = Record<string, unknown>;

export type WalletPulseBackupPayload = {
  formatVersion: number;
  schemaVersion: number;
  exportedAt: number;
  appVersion: string;
  wallets: UnknownRecord[];
  categories: UnknownRecord[];
  transactions: UnknownRecord[];
  budgets: UnknownRecord[];
  goals: UnknownRecord[];
  subscriptions: UnknownRecord[];
  bill_reminders: UnknownRecord[];
  tags: UnknownRecord[];
  app_settings: UnknownRecord[];
  fx_rates: UnknownRecord[];
  notification_logs: UnknownRecord[];
  parsing_rules: UnknownRecord[];
  transaction_templates: UnknownRecord[];
};

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function reqString(r: UnknownRecord, key: string): string {
  const v = r[key];
  if (typeof v !== 'string') {
    throw new Error(`Invalid backup: missing or invalid string "${key}"`);
  }
  return v;
}

function reqNumber(r: UnknownRecord, key: string): number {
  const v = r[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`Invalid backup: missing or invalid number "${key}"`);
  }
  return v;
}

function optNumber(r: UnknownRecord, key: string): number | null {
  const v = r[key];
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return null;
  }
  return v;
}

function reqBool(r: UnknownRecord, key: string): boolean {
  const v = r[key];
  if (typeof v !== 'boolean') {
    throw new Error(`Invalid backup: missing or invalid boolean "${key}"`);
  }
  return v;
}

function reqStringArrayKey(data: UnknownRecord, key: string): UnknownRecord[] {
  const v = data[key];
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter(isRecord);
}

function parseBackupPayload(jsonText: string): WalletPulseBackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Backup file is not valid JSON');
  }
  if (!isRecord(parsed)) {
    throw new Error('Backup root must be an object');
  }
  const fv = parsed.formatVersion;
  if (typeof fv !== 'number' || fv < 1 || fv > WALLET_PULSE_BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup format version: ${String(fv)}`,
    );
  }
  if (typeof parsed.schemaVersion !== 'number') {
    throw new Error('Backup is missing schemaVersion');
  }
  if (parsed.schemaVersion !== dbSchema.version) {
    throw new Error(
      `Backup schema version ${String(parsed.schemaVersion)} does not match app database schema ${String(dbSchema.version)}`,
    );
  }
  return {
    formatVersion: WALLET_PULSE_BACKUP_FORMAT_VERSION,
    schemaVersion: parsed.schemaVersion as number,
    exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : 0,
    appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : '',
    wallets: reqStringArrayKey(parsed, 'wallets'),
    categories: reqStringArrayKey(parsed, 'categories'),
    transactions: reqStringArrayKey(parsed, 'transactions'),
    budgets: reqStringArrayKey(parsed, 'budgets'),
    goals: reqStringArrayKey(parsed, 'goals'),
    subscriptions: reqStringArrayKey(parsed, 'subscriptions'),
    bill_reminders: reqStringArrayKey(parsed, 'bill_reminders'),
    tags: reqStringArrayKey(parsed, 'tags'),
    app_settings: reqStringArrayKey(parsed, 'app_settings'),
    fx_rates: reqStringArrayKey(parsed, 'fx_rates'),
    notification_logs: reqStringArrayKey(parsed, 'notification_logs'),
    parsing_rules: reqStringArrayKey(parsed, 'parsing_rules'),
    transaction_templates: reqStringArrayKey(parsed, 'transaction_templates'),
  };
}

function sortCategoriesForInsert(rows: UnknownRecord[]): UnknownRecord[] {
  const byId = new Map(rows.map((r) => [reqString(r, 'id'), r]));
  const result: UnknownRecord[] = [];
  const inserted = new Set<string>();
  let remaining = [...rows];
  while (remaining.length > 0) {
    const next: UnknownRecord[] = [];
    let progressed = false;
    for (const row of remaining) {
      const id = reqString(row, 'id');
      const parentRaw = row.parent_id;
      const parentId =
        parentRaw === null || parentRaw === undefined
          ? null
          : typeof parentRaw === 'string'
            ? parentRaw
            : null;
      if (
        parentId === null ||
        parentId === '' ||
        inserted.has(parentId) ||
        !byId.has(parentId)
      ) {
        result.push(row);
        inserted.add(id);
        progressed = true;
      } else {
        next.push(row);
      }
    }
    if (!progressed) {
      result.push(...next);
      break;
    }
    remaining = next;
  }
  return result;
}

function backupFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${BACKUP_FILE_PREFIX}${stamp}.json`;
}

async function fetchAllRows(): Promise<WalletPulseBackupPayload> {
  const wallets = await database
    .get<WalletModel>('wallets')
    .query()
    .fetch();
  const categories = await database
    .get<CategoryModel>('categories')
    .query()
    .fetch();
  const transactions = await database
    .get<TransactionModel>('transactions')
    .query()
    .fetch();
  const budgets = await database.get<BudgetModel>('budgets').query().fetch();
  const goals = await database.get<GoalModel>('goals').query().fetch();
  const subscriptions = await database
    .get<SubscriptionModel>('subscriptions')
    .query()
    .fetch();
  const billReminders = await database
    .get<BillReminderModel>('bill_reminders')
    .query()
    .fetch();
  const tags = await database.get<TagModel>('tags').query().fetch();
  const appSettings = await database
    .get<AppSettingsModel>('app_settings')
    .query()
    .fetch();
  const fxRates = await database
    .get<FxRateModel>('fx_rates')
    .query()
    .fetch();
  const notificationLogs = await database
    .get<NotificationLogModel>('notification_logs')
    .query()
    .fetch();
  const parsingRules = await database
    .get<ParsingRuleModel>('parsing_rules')
    .query()
    .fetch();
  const transactionTemplates = await database
    .get<TransactionTemplateModel>('transaction_templates')
    .query()
    .fetch();

  return {
    formatVersion: WALLET_PULSE_BACKUP_FORMAT_VERSION,
    schemaVersion: dbSchema.version,
    exportedAt: Date.now(),
    appVersion: APP_VERSION,
    wallets: wallets.map((w) => ({
      id: w.id,
      currency: w.currency,
      name: w.name,
      balance: w.balance,
      is_active: w.isActive,
      icon: w.icon,
      color: w.color,
      sort_order: w.sortOrder,
      created_at: w.createdAt.getTime(),
      updated_at: w.updatedAt.getTime(),
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type,
      parent_id: c.parentId,
      is_default: c.isDefault,
      is_archived: c.isArchived,
      sort_order: c.sortOrder,
      created_at: c.createdAt.getTime(),
      updated_at: c.updatedAt.getTime(),
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      wallet_id: t.walletId,
      category_id: t.categoryId,
      amount: t.amount,
      currency: t.currency,
      type: t.type,
      description: t.description,
      merchant: t.merchant,
      source: t.source,
      source_hash: t.sourceHash,
      tags: t.tags,
      receipt_uri: t.receiptUri,
      is_recurring: t.isRecurring,
      recurrence_rule: t.recurrenceRule,
      confidence: t.confidence,
      location_lat: t.locationLat,
      location_lng: t.locationLng,
      location_name: t.locationName,
      notes: t.notes,
      is_template: t.isTemplate,
      template_name: t.templateName,
      transaction_date: t.transactionDate,
      created_at: t.createdAt.getTime(),
      updated_at: t.updatedAt.getTime(),
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      category_id: b.categoryId,
      amount: b.amount,
      currency: b.currency,
      period: b.period,
      start_date: b.startDate,
      end_date: b.endDate,
      rollover: b.rollover,
      is_active: b.isActive,
      created_at: b.createdAt.getTime(),
      updated_at: b.updatedAt.getTime(),
    })),
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      target_amount: g.targetAmount,
      current_amount: g.currentAmount,
      currency: g.currency,
      deadline: g.deadline,
      icon: g.icon,
      color: g.color,
      category: g.category,
      is_completed: g.isCompleted,
      completed_at: g.completedAt,
      created_at: g.createdAt.getTime(),
      updated_at: g.updatedAt.getTime(),
    })),
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      amount: s.amount,
      currency: s.currency,
      billing_cycle: s.billingCycle,
      next_due_date: s.nextDueDate,
      category_id: s.categoryId,
      is_active: s.isActive,
      cancelled_at: s.cancelledAt,
      icon: s.icon,
      color: s.color,
      created_at: s.createdAt.getTime(),
      updated_at: s.updatedAt.getTime(),
    })),
    bill_reminders: billReminders.map((b) => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      currency: b.currency,
      due_date: b.dueDate,
      recurrence: b.recurrence,
      category_id: b.categoryId,
      is_paid: b.isPaid,
      paid_transaction_id: b.paidTransactionId,
      remind_days_before: b.remindDaysBefore,
      created_at: b.createdAt.getTime(),
      updated_at: b.updatedAt.getTime(),
    })),
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      usage_count: t.usageCount,
      created_at: t.createdAt.getTime(),
      updated_at: t.updatedAt.getTime(),
    })),
    app_settings: appSettings.map((a) => ({
      id: a.id,
      key: a.key,
      value: a.value,
      created_at: a.createdAt.getTime(),
      updated_at: a.updatedAt.getTime(),
    })),
    fx_rates: fxRates.map((f) => ({
      id: f.id,
      base_currency: f.baseCurrency,
      target_currency: f.targetCurrency,
      rate: f.rate,
      fetched_at: f.fetchedAt,
      created_at: f.createdAt.getTime(),
      updated_at: f.updatedAt.getTime(),
    })),
    notification_logs: notificationLogs.map((n) => ({
      id: n.id,
      package_name: n.packageName,
      title: n.title,
      body: n.body,
      parsed_successfully: n.parsedSuccessfully,
      parse_result: n.parseResult,
      transaction_id: n.transactionId,
      received_at: n.receivedAt,
      created_at: n.createdAt.getTime(),
      updated_at: n.updatedAt.getTime(),
    })),
    parsing_rules: parsingRules.map((p) => ({
      id: p.id,
      source_app: p.sourceApp,
      package_name: p.packageName,
      rule_name: p.ruleName,
      pattern: p.pattern,
      transaction_type: p.transactionType,
      is_active: p.isActive,
      priority: p.priority,
      created_at: p.createdAt.getTime(),
      updated_at: p.updatedAt.getTime(),
    })),
    transaction_templates: transactionTemplates.map((tt) => ({
      id: tt.id,
      name: tt.name,
      amount: tt.amount,
      currency: tt.currency,
      type: tt.type,
      category_id: tt.categoryId,
      description: tt.description,
      merchant: tt.merchant,
      usage_count: tt.usageCount,
      created_at: tt.createdAt.getTime(),
      updated_at: tt.updatedAt.getTime(),
    })),
  };
}

async function runBatched<T>(
  db: Database,
  rows: T[],
  makeOps: (chunk: T[]) => Array<Parameters<Database['batch']>[0]>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + BATCH_CHUNK_SIZE);
    await db.write(async () => {
      const ops = makeOps(chunk);
      await db.batch(...ops);
    });
  }
}

async function insertRestoredData(
  db: Database,
  payload: WalletPulseBackupPayload,
): Promise<void> {
  const walletsCol = db.get<WalletModel>('wallets');
  const categoriesCol = db.get<CategoryModel>('categories');
  const tagsCol = db.get<TagModel>('tags');
  const appSettingsCol = db.get<AppSettingsModel>('app_settings');
  const budgetsCol = db.get<BudgetModel>('budgets');
  const goalsCol = db.get<GoalModel>('goals');
  const subscriptionsCol = db.get<SubscriptionModel>('subscriptions');
  const billRemindersCol = db.get<BillReminderModel>('bill_reminders');
  const transactionsCol = db.get<TransactionModel>('transactions');

  await runBatched(db, payload.wallets, (chunk) =>
    chunk.map((row) =>
      walletsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.currency = reqString(row, 'currency');
        rec.name = reqString(row, 'name');
        rec.balance = reqNumber(row, 'balance');
        rec.isActive = reqBool(row, 'is_active');
        rec.icon = reqString(row, 'icon');
        rec.color = reqString(row, 'color');
        rec.sortOrder = reqNumber(row, 'sort_order');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  const sortedCategories = sortCategoriesForInsert(payload.categories);
  await runBatched(db, sortedCategories, (chunk) =>
    chunk.map((row) =>
      categoriesCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.name = reqString(row, 'name');
        rec.icon = reqString(row, 'icon');
        rec.color = reqString(row, 'color');
        rec.type = reqString(row, 'type');
        const pid = row.parent_id;
        rec.parentId =
          pid === null || pid === undefined
            ? null
            : typeof pid === 'string'
              ? pid
              : null;
        rec.isDefault = reqBool(row, 'is_default');
        rec.isArchived = reqBool(row, 'is_archived');
        rec.sortOrder = reqNumber(row, 'sort_order');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  await runBatched(db, payload.tags, (chunk) =>
    chunk.map((row) =>
      tagsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.name = reqString(row, 'name');
        const col = row.color;
        rec.color = typeof col === 'string' ? col : '';
        rec.usageCount = reqNumber(row, 'usage_count');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  await runBatched(db, payload.app_settings, (chunk) =>
    chunk.map((row) =>
      appSettingsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.key = reqString(row, 'key');
        rec.value = reqString(row, 'value');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  await runBatched(db, payload.budgets, (chunk) =>
    chunk.map((row) =>
      budgetsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        const cid = row.category_id;
        rec.categoryId =
          cid === null || cid === undefined
            ? null
            : typeof cid === 'string'
              ? cid
              : null;
        rec.amount = reqNumber(row, 'amount');
        rec.currency = reqString(row, 'currency');
        rec.period = reqString(row, 'period');
        rec.startDate = reqNumber(row, 'start_date');
        rec.endDate = reqNumber(row, 'end_date');
        rec.rollover = reqBool(row, 'rollover');
        rec.isActive = reqBool(row, 'is_active');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  await runBatched(db, payload.goals, (chunk) =>
    chunk.map((row) =>
      goalsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.name = reqString(row, 'name');
        rec.targetAmount = reqNumber(row, 'target_amount');
        rec.currentAmount = reqNumber(row, 'current_amount');
        rec.currency = reqString(row, 'currency');
        rec.deadline = reqNumber(row, 'deadline');
        rec.icon = reqString(row, 'icon');
        rec.color = reqString(row, 'color');
        rec.category = reqString(row, 'category');
        rec.isCompleted = reqBool(row, 'is_completed');
        rec.completedAt = optNumber(row, 'completed_at');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  await runBatched(db, payload.subscriptions, (chunk) =>
    chunk.map((row) =>
      subscriptionsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.name = reqString(row, 'name');
        rec.amount = reqNumber(row, 'amount');
        rec.currency = reqString(row, 'currency');
        rec.billingCycle = reqString(row, 'billing_cycle');
        rec.nextDueDate = reqNumber(row, 'next_due_date');
        rec.categoryId = reqString(row, 'category_id');
        rec.isActive = reqBool(row, 'is_active');
        const ca = row.cancelled_at;
        rec.cancelledAt =
          ca === null || ca === undefined
            ? null
            : typeof ca === 'number'
              ? ca
              : null;
        rec.icon = reqString(row, 'icon');
        rec.color = reqString(row, 'color');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  await runBatched(db, payload.bill_reminders, (chunk) =>
    chunk.map((row) =>
      billRemindersCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.name = reqString(row, 'name');
        rec.amount = reqNumber(row, 'amount');
        rec.currency = reqString(row, 'currency');
        rec.dueDate = reqNumber(row, 'due_date');
        rec.recurrence = reqString(row, 'recurrence');
        rec.categoryId = reqString(row, 'category_id');
        rec.isPaid = reqBool(row, 'is_paid');
        const pt = row.paid_transaction_id;
        rec.paidTransactionId =
          pt === null || pt === undefined
            ? null
            : typeof pt === 'string'
              ? pt
              : null;
        rec.remindDaysBefore = reqNumber(row, 'remind_days_before');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  await runBatched(db, payload.transactions, (chunk) =>
    chunk.map((row) =>
      transactionsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.walletId = reqString(row, 'wallet_id');
        rec.categoryId = reqString(row, 'category_id');
        rec.amount = reqNumber(row, 'amount');
        rec.currency = reqString(row, 'currency');
        rec.type = reqString(row, 'type');
        rec.description = reqString(row, 'description');
        rec.merchant = reqString(row, 'merchant');
        rec.source = reqString(row, 'source');
        rec.sourceHash = reqString(row, 'source_hash');
        rec.tags = reqString(row, 'tags');
        rec.receiptUri = reqString(row, 'receipt_uri');
        rec.isRecurring = reqBool(row, 'is_recurring');
        rec.recurrenceRule = reqString(row, 'recurrence_rule');
        rec.confidence = reqNumber(row, 'confidence');
        rec.locationLat = optNumber(row, 'location_lat');
        rec.locationLng = optNumber(row, 'location_lng');
        const ln = row.location_name;
        rec.locationName =
          ln === null || ln === undefined
            ? null
            : typeof ln === 'string'
              ? ln
              : null;
        rec.notes = reqString(row, 'notes');
        rec.isTemplate = reqBool(row, 'is_template');
        rec.templateName = reqString(row, 'template_name');
        rec.transactionDate = reqNumber(row, 'transaction_date');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  const fxRatesCol = db.get<FxRateModel>('fx_rates');
  await runBatched(db, payload.fx_rates, (chunk) =>
    chunk.map((row) =>
      fxRatesCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.baseCurrency = reqString(row, 'base_currency');
        rec.targetCurrency = reqString(row, 'target_currency');
        rec.rate = reqNumber(row, 'rate');
        rec.fetchedAt = reqNumber(row, 'fetched_at');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  const notifLogsCol = db.get<NotificationLogModel>('notification_logs');
  await runBatched(db, payload.notification_logs, (chunk) =>
    chunk.map((row) =>
      notifLogsCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.packageName = reqString(row, 'package_name');
        rec.title = reqString(row, 'title');
        rec.body = reqString(row, 'body');
        rec.parsedSuccessfully = reqBool(row, 'parsed_successfully');
        rec.parseResult = reqString(row, 'parse_result');
        const tid = row.transaction_id;
        rec.transactionId =
          tid === null || tid === undefined ? '' : typeof tid === 'string' ? tid : '';
        rec.receivedAt = reqNumber(row, 'received_at');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  const parsingRulesCol = db.get<ParsingRuleModel>('parsing_rules');
  await runBatched(db, payload.parsing_rules, (chunk) =>
    chunk.map((row) =>
      parsingRulesCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.sourceApp = reqString(row, 'source_app');
        rec.packageName = reqString(row, 'package_name');
        rec.ruleName = reqString(row, 'rule_name');
        rec.pattern = reqString(row, 'pattern');
        rec.transactionType = reqString(row, 'transaction_type');
        rec.isActive = reqBool(row, 'is_active');
        rec.priority = reqNumber(row, 'priority');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );

  const templatesCol = db.get<TransactionTemplateModel>('transaction_templates');
  await runBatched(db, payload.transaction_templates, (chunk) =>
    chunk.map((row) =>
      templatesCol.prepareCreate((rec) => {
        rec._raw.id = reqString(row, 'id');
        rec.name = reqString(row, 'name');
        rec.amount = reqNumber(row, 'amount');
        rec.currency = reqString(row, 'currency');
        rec.type = reqString(row, 'type');
        rec.categoryId = reqString(row, 'category_id');
        rec.description = reqString(row, 'description');
        rec.merchant = reqString(row, 'merchant');
        rec.usageCount = reqNumber(row, 'usage_count');
        rec._setRaw('created_at', reqNumber(row, 'created_at'));
        rec._setRaw('updated_at', reqNumber(row, 'updated_at'));
      }),
    ),
  );
}

/**
 * Exports core app tables to JSON and writes the file to the public Download folder (Android).
 */
export async function createBackup(): Promise<string> {
  const dir = RNFS.DownloadDirectoryPath;
  const exists = await RNFS.exists(dir);
  if (!exists) {
    throw new Error('Download folder is not available on this device');
  }
  const payload = await fetchAllRows();
  const body = JSON.stringify(
    {
      app: APP_NAME,
      formatVersion: payload.formatVersion,
      schemaVersion: payload.schemaVersion,
      exportedAt: payload.exportedAt,
      appVersion: payload.appVersion,
      wallets: payload.wallets,
      categories: payload.categories,
      transactions: payload.transactions,
      budgets: payload.budgets,
      goals: payload.goals,
      subscriptions: payload.subscriptions,
      bill_reminders: payload.bill_reminders,
      tags: payload.tags,
      app_settings: payload.app_settings,
      fx_rates: payload.fx_rates,
      notification_logs: payload.notification_logs,
      parsing_rules: payload.parsing_rules,
      transaction_templates: payload.transaction_templates,
    },
    null,
    2,
  );
  const path = `${dir}/${backupFilename()}`;
  await RNFS.writeFile(path, body, 'utf8');
  return path;
}

/**
 * Lists WalletPulse backup JSON files in the Download directory, newest first.
 */
export async function listBackups(): Promise<BackupFileInfo[]> {
  const dir = RNFS.DownloadDirectoryPath;
  const exists = await RNFS.exists(dir);
  if (!exists) {
    return [];
  }
  const entries = await RNFS.readDir(dir);
  const files = entries.filter(
    (e) =>
      e.isFile() &&
      e.name.startsWith(BACKUP_FILE_PREFIX) &&
      e.name.endsWith('.json'),
  );
  const withStat: BackupFileInfo[] = [];
  for (const e of files) {
    try {
      const stat = await RNFS.stat(e.path);
      withStat.push({
        path: e.path,
        name: e.name,
        mtime: stat.mtime instanceof Date ? stat.mtime.getTime() : (stat.mtime ?? 0),
        size: stat.size,
      });
    } catch {
      withStat.push({
        path: e.path,
        name: e.name,
        mtime: 0,
        size: 0,
      });
    }
  }
  withStat.sort((a, b) => b.mtime - a.mtime);
  return withStat;
}

/**
 * Replaces all database contents with data from a backup file.
 * Call only after the user confirms in the UI. Uses a full database reset, then batch inserts.
 */
export async function restoreBackup(filePath: string): Promise<RestoreBackupResult> {
  try {
    const jsonText = await RNFS.readFile(filePath, 'utf8');
    const payload = parseBackupPayload(jsonText);
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    await insertRestoredData(database, payload);
    return {ok: true};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {ok: false, error: message};
  }
}
