import { Module } from '@nestjs/common';
import { SUBSCRIPTION_OPS_REPOSITORY } from './domain/subscription-ops.repository';
import { SubscriptionOpsPrismaRepository } from './infrastructure/persistence/subscription-ops-prisma.repository';

/**
 * Subscription management bounded context: the admin operational overlay over the
 * bookings subscriptions. The repository is exported so the admin subscriptions
 * workspace can read and drive the overlay.
 */
@Module({
  providers: [{ provide: SUBSCRIPTION_OPS_REPOSITORY, useClass: SubscriptionOpsPrismaRepository }],
  exports: [SUBSCRIPTION_OPS_REPOSITORY],
})
export class SubscriptionManagementModule {}
