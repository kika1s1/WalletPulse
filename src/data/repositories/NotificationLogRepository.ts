import type {SupabaseClient} from '@supabase/supabase-js';
import type {NotificationLog} from '@domain/entities/NotificationLog';
import type {INotificationLogRepository} from '@domain/repositories/INotificationLogRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): NotificationLog {
  return {
    id: row.id as string,
    packageName: row.package_name as string,
    title: (row.title as string) ?? '',
    body: (row.body as string) ?? '',
    parsedSuccessfully: row.parsed_successfully as boolean,
    parseResult: (row.parse_result as string) ?? '',
    transactionId: (row.transaction_id as string | null) ?? undefined,
    receivedAt: Number(row.received_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class NotificationLogRepository implements INotificationLogRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findById(id: string): Promise<NotificationLog | null> {
    const {data} = await this.supabase
      .from('notification_logs').select('*')
      .eq('id', id).eq('user_id', this.userId).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(): Promise<NotificationLog[]> {
    const {data, error} = await this.supabase
      .from('notification_logs').select('*').eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findRecent(limit: number): Promise<NotificationLog[]> {
    const {data, error} = await this.supabase
      .from('notification_logs').select('*')
      .eq('user_id', this.userId)
      .order('received_at', {ascending: false}).limit(limit);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByPackageName(packageName: string): Promise<NotificationLog[]> {
    const {data, error} = await this.supabase
      .from('notification_logs').select('*')
      .eq('user_id', this.userId).eq('package_name', packageName);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findFailed(): Promise<NotificationLog[]> {
    const {data, error} = await this.supabase
      .from('notification_logs').select('*')
      .eq('user_id', this.userId).eq('parsed_successfully', false);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async save(log: NotificationLog): Promise<void> {
    const {error} = await this.supabase.from('notification_logs').insert({
      id: log.id, user_id: this.userId,
      package_name: log.packageName, title: log.title, body: log.body,
      parsed_successfully: log.parsedSuccessfully,
      parse_result: log.parseResult,
      transaction_id: log.transactionId ?? null,
      received_at: log.receivedAt,
      created_at: log.createdAt, updated_at: log.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('notification_logs').delete()
      .eq('id', id).eq('user_id', this.userId);
  }

  async deleteOlderThan(timestampMs: number): Promise<void> {
    await this.supabase.from('notification_logs').delete()
      .eq('user_id', this.userId).lt('received_at', timestampMs);
  }
}
