import { SubscriptionOps } from '@modules/subscription-management/domain/subscription-ops.entity';
import { SubscriptionOpsRepository } from '@modules/subscription-management/domain/subscription-ops.repository';
import { IdGenerator } from '@shared/application/ports/id-generator.port';

/**
 * Find the operational overlay for a subscription, creating a fresh one when none
 * exists yet (no application to subscription activation flow creates it up front).
 */
export async function ensureSubscriptionOverlay(
  repository: SubscriptionOpsRepository,
  ids: IdGenerator,
  subscriptionId: string,
  now: Date,
): Promise<SubscriptionOps> {
  const existing = await repository.findBySubscriptionId(subscriptionId);
  if (existing !== null) {
    return existing;
  }
  return SubscriptionOps.create({ id: ids.generate(), subscriptionId, now });
}
