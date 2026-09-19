import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '@modules/bookings/domain/subscription.repository';
import { SubscriptionOpsEventType } from '@modules/subscription-management/domain/subscription-ops-event-type.enum';
import {
  SUBSCRIPTION_OPS_REPOSITORY,
  SubscriptionOpsRepository,
} from '@modules/subscription-management/domain/subscription-ops.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ensureSubscriptionOverlay } from '../ensure-subscription-overlay';

export type SubscriptionLifecycleAction =
  'PAUSE' | 'RESUME' | 'ENABLE_AUTO_RENEW' | 'DISABLE_AUTO_RENEW' | 'FORCE_RENEW';

export const SUBSCRIPTION_LIFECYCLE_ACTIONS: SubscriptionLifecycleAction[] = [
  'PAUSE',
  'RESUME',
  'ENABLE_AUTO_RENEW',
  'DISABLE_AUTO_RENEW',
  'FORCE_RENEW',
];

interface SubscriptionLifecycleActionCommand {
  subscriptionId: string;
  adminId: string;
  action: SubscriptionLifecycleAction;
}

/**
 * Admin lifecycle actions on a subscription: pause, resume, toggle auto renew and a
 * manual force renewal. Each change is applied to the bookings subscription (where it
 * is a subscription concern) and mirrored onto the operational overlay log.
 */
@Injectable()
export class SubscriptionLifecycleActionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(SUBSCRIPTION_OPS_REPOSITORY) private readonly overlays: SubscriptionOpsRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SubscriptionLifecycleActionCommand): Promise<void> {
    const now = this.clock.now();
    const overlay = await ensureSubscriptionOverlay(
      this.overlays,
      this.ids,
      command.subscriptionId,
      now,
    );

    if (command.action === 'FORCE_RENEW') {
      overlay.recordRenewal('Manual force renewal completed.', 'Admin', now);
      await this.overlays.save(overlay);
      return;
    }

    const subscription = await this.subscriptions.findById(command.subscriptionId);
    if (subscription === null) {
      throw new NotFoundDomainException('Subscription not found');
    }

    switch (command.action) {
      case 'PAUSE':
        subscription.pause(now);
        overlay.logLifecycle(
          SubscriptionOpsEventType.Paused,
          'Subscription paused',
          command.adminId,
          now,
        );
        break;
      case 'RESUME':
        subscription.resume(now);
        overlay.logLifecycle(
          SubscriptionOpsEventType.Resumed,
          'Subscription resumed',
          command.adminId,
          now,
        );
        break;
      case 'ENABLE_AUTO_RENEW':
        subscription.setAutoRenew(true, now);
        overlay.logLifecycle(
          SubscriptionOpsEventType.AutoRenewEnabled,
          'Auto renew enabled',
          command.adminId,
          now,
        );
        break;
      case 'DISABLE_AUTO_RENEW':
        subscription.setAutoRenew(false, now);
        overlay.logLifecycle(
          SubscriptionOpsEventType.AutoRenewDisabled,
          'Auto renew disabled',
          command.adminId,
          now,
        );
        break;
    }

    await this.subscriptions.save(subscription);
    await this.overlays.save(overlay);
  }
}
