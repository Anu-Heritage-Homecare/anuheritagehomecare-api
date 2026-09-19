import { SubscriptionOps } from './subscription-ops.entity';

/**
 * Persistence port for the SubscriptionOps overlay aggregate. Saving also appends
 * any new events and notes recorded on the aggregate.
 */
export interface SubscriptionOpsRepository {
  save(ops: SubscriptionOps): Promise<void>;
  findBySubscriptionId(subscriptionId: string): Promise<SubscriptionOps | null>;
}

export const SUBSCRIPTION_OPS_REPOSITORY = Symbol('SUBSCRIPTION_OPS_REPOSITORY');
