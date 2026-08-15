import { Subscription } from './subscription.entity';

/** Persistence port for the Subscription aggregate. */
export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findById(id: string): Promise<Subscription | null>;
  listByOwner(ownerId: string): Promise<Subscription[]>;
}

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
