import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_OPS_REPOSITORY,
  SubscriptionOpsRepository,
} from '@modules/subscription-management/domain/subscription-ops.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { ensureSubscriptionOverlay } from '../ensure-subscription-overlay';

export type SubscriptionHoursAction =
  'SET_CYCLE' | 'ADD_HOURS' | 'ADJUST_BALANCE' | 'EXTEND_EXPIRY';

export const SUBSCRIPTION_HOURS_ACTIONS: SubscriptionHoursAction[] = [
  'SET_CYCLE',
  'ADD_HOURS',
  'ADJUST_BALANCE',
  'EXTEND_EXPIRY',
];

interface SubscriptionHoursActionCommand {
  subscriptionId: string;
  adminId: string;
  action: SubscriptionHoursAction;
  allocatedHours?: number;
  usedHours?: number;
  addHours?: number;
  cycleEndsAt?: Date;
}

/** Hours are stored as integer tenths of an hour. */
function toTenths(hours: number): number {
  return Math.round(hours * 10);
}

/**
 * Admin actions on a subscription's flexible hours ledger: set the cycle, add hours,
 * adjust the consumed balance and extend the cycle expiry. All operate on the
 * operational overlay.
 */
@Injectable()
export class SubscriptionHoursActionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_OPS_REPOSITORY) private readonly overlays: SubscriptionOpsRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SubscriptionHoursActionCommand): Promise<void> {
    const now = this.clock.now();
    const overlay = await ensureSubscriptionOverlay(
      this.overlays,
      this.ids,
      command.subscriptionId,
      now,
    );

    switch (command.action) {
      case 'SET_CYCLE':
        if (
          command.allocatedHours === undefined ||
          command.usedHours === undefined ||
          command.cycleEndsAt === undefined
        ) {
          throw new ValidationException('Allocated hours, used hours and a cycle end are required');
        }
        overlay.setFlexibleHours(
          toTenths(command.allocatedHours),
          toTenths(command.usedHours),
          command.cycleEndsAt,
          command.adminId,
          now,
        );
        break;
      case 'ADD_HOURS':
        if (command.addHours === undefined) {
          throw new ValidationException('A number of hours to add is required');
        }
        overlay.addHours(toTenths(command.addHours), command.adminId, now);
        break;
      case 'ADJUST_BALANCE':
        if (command.usedHours === undefined) {
          throw new ValidationException('The used hours to set are required');
        }
        overlay.adjustConsumed(toTenths(command.usedHours), command.adminId, now);
        break;
      case 'EXTEND_EXPIRY':
        if (command.cycleEndsAt === undefined) {
          throw new ValidationException('A new cycle end date is required');
        }
        overlay.extendExpiry(command.cycleEndsAt, command.adminId, now);
        break;
    }

    await this.overlays.save(overlay);
  }
}
