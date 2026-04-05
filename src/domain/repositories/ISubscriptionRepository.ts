import type {Subscription} from '@domain/entities/Subscription';

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findAll(): Promise<Subscription[]>;
  findActive(): Promise<Subscription[]>;
  findCancelled(): Promise<Subscription[]>;
  save(subscription: Subscription): Promise<void>;
  update(subscription: Subscription): Promise<void>;
  cancel(id: string, cancelledAt: number): Promise<void>;
  delete(id: string): Promise<void>;
}
