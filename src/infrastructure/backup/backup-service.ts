import * as RNFS from '@dr.pogodin/react-native-fs';
import {getSupabaseClient} from '@data/datasources/supabase-client';
import {APP_NAME, APP_VERSION} from '@shared/constants/app';

export const WALLET_PULSE_BACKUP_FORMAT_VERSION = 3;
const SUPABASE_SCHEMA_VERSION = 1;

const BACKUP_FILE_PREFIX = 'WalletPulse-backup-';

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

const TABLE_NAMES = [
  'wallets', 'categories', 'transactions', 'budgets', 'goals',
  'subscriptions', 'bill_reminders', 'tags', 'app_settings',
  'fx_rates', 'notification_logs', 'parsing_rules', 'transaction_templates',
] as const;

function backupFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${BACKUP_FILE_PREFIX}${stamp}.json`;
}

async function fetchAllRows(userId: string): Promise<WalletPulseBackupPayload> {
  const supabase = getSupabaseClient();
  const result: Record<string, UnknownRecord[]> = {};

  for (const table of TABLE_NAMES) {
    const needsUserFilter = table !== 'fx_rates';
    let query = supabase.from(table).select('*');
    if (needsUserFilter) {
      query = query.eq('user_id', userId);
    }
    const {data, error} = await query;
    if (error) { throw new Error(`Failed to export ${table}: ${error.message}`); }
    result[table] = (data ?? []) as UnknownRecord[];
  }

  return {
    formatVersion: WALLET_PULSE_BACKUP_FORMAT_VERSION,
    schemaVersion: SUPABASE_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appVersion: APP_VERSION,
    wallets: result.wallets,
    categories: result.categories,
    transactions: result.transactions,
    budgets: result.budgets,
    goals: result.goals,
    subscriptions: result.subscriptions,
    bill_reminders: result.bill_reminders,
    tags: result.tags,
    app_settings: result.app_settings,
    fx_rates: result.fx_rates,
    notification_logs: result.notification_logs,
    parsing_rules: result.parsing_rules,
    transaction_templates: result.transaction_templates,
  };
}

export async function createBackup(userId: string): Promise<string> {
  const dir = RNFS.DownloadDirectoryPath;
  const exists = await RNFS.exists(dir);
  if (!exists) {
    throw new Error('Download folder is not available on this device');
  }
  const payload = await fetchAllRows(userId);
  const body = JSON.stringify(
    {app: APP_NAME, ...payload},
    null,
    2,
  );
  const path = `${dir}/${backupFilename()}`;
  await RNFS.writeFile(path, body, 'utf8');
  return path;
}

export async function listBackups(): Promise<BackupFileInfo[]> {
  const dir = RNFS.DownloadDirectoryPath;
  const exists = await RNFS.exists(dir);
  if (!exists) { return []; }
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
      withStat.push({path: e.path, name: e.name, mtime: 0, size: 0});
    }
  }
  withStat.sort((a, b) => b.mtime - a.mtime);
  return withStat;
}

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function reqStringArrayKey(data: UnknownRecord, key: string): UnknownRecord[] {
  const v = data[key];
  if (!Array.isArray(v)) { return []; }
  return v.filter(isRecord);
}

function parseBackupPayload(jsonText: string): WalletPulseBackupPayload {
  let parsed: unknown;
  try { parsed = JSON.parse(jsonText); }
  catch { throw new Error('Backup file is not valid JSON'); }
  if (!isRecord(parsed)) { throw new Error('Backup root must be an object'); }
  return {
    formatVersion: WALLET_PULSE_BACKUP_FORMAT_VERSION,
    schemaVersion: (parsed.schemaVersion as number) ?? SUPABASE_SCHEMA_VERSION,
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

export async function restoreBackup(filePath: string, userId: string): Promise<RestoreBackupResult> {
  try {
    const supabase = getSupabaseClient();
    const jsonText = await RNFS.readFile(filePath, 'utf8');
    const payload = parseBackupPayload(jsonText);

    const userScopedTables = TABLE_NAMES.filter((t) => t !== 'fx_rates');
    for (const table of [...userScopedTables].reverse()) {
      await supabase.from(table).delete().eq('user_id', userId);
    }

    for (const table of TABLE_NAMES) {
      const rows = payload[table as keyof WalletPulseBackupPayload];
      if (!Array.isArray(rows) || rows.length === 0) { continue; }

      const needsUserId = table !== 'fx_rates';
      const insertRows = (rows as UnknownRecord[]).map((row) => {
        const {user_id: _uid, ...rest} = row;
        return needsUserId ? {...rest, user_id: userId} : rest;
      });

      for (let i = 0; i < insertRows.length; i += 200) {
        const chunk = insertRows.slice(i, i + 200);
        const {error} = await supabase.from(table).insert(chunk as any);
        if (error) { throw new Error(`Failed to restore ${table}: ${error.message}`); }
      }
    }

    return {ok: true};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {ok: false, error: message};
  }
}
