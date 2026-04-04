import type {NotificationLog} from '@domain/entities/NotificationLog';

export interface INotificationLogRepository {
  findById(id: string): Promise<NotificationLog | null>;
  findAll(): Promise<NotificationLog[]>;
  findRecent(limit: number): Promise<NotificationLog[]>;
  findByPackageName(packageName: string): Promise<NotificationLog[]>;
  findFailed(): Promise<NotificationLog[]>;
  save(log: NotificationLog): Promise<void>;
  delete(id: string): Promise<void>;
  deleteOlderThan(timestampMs: number): Promise<void>;
}
