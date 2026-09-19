import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_OPS_REPOSITORY,
  SubscriptionOpsRepository,
} from '@modules/subscription-management/domain/subscription-ops.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ensureSubscriptionOverlay } from '../ensure-subscription-overlay';

export type SubscriptionRole = 'COORDINATOR' | 'CAREGIVER';

export const SUBSCRIPTION_ROLES: SubscriptionRole[] = ['COORDINATOR', 'CAREGIVER'];

interface AssignCommand {
  subscriptionId: string;
  adminId: string;
  role: SubscriptionRole;
  personId: string;
}

interface AddNoteCommand {
  subscriptionId: string;
  adminId: string;
  body: string;
  authorName: string | null;
}

/** Assign the coordinator or caregiver on a subscription overlay. */
@Injectable()
export class AssignSubscriptionRoleUseCase {
  constructor(
    @Inject(SUBSCRIPTION_OPS_REPOSITORY) private readonly overlays: SubscriptionOpsRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AssignCommand): Promise<void> {
    const now = this.clock.now();
    const overlay = await ensureSubscriptionOverlay(
      this.overlays,
      this.ids,
      command.subscriptionId,
      now,
    );
    if (command.role === 'COORDINATOR') {
      overlay.assignCoordinator(command.personId, command.adminId, now);
    } else {
      overlay.assignCaregiver(command.personId, command.adminId, now);
    }
    await this.overlays.save(overlay);
  }
}

/** Add a free text note to a subscription overlay. */
@Injectable()
export class AddSubscriptionNoteUseCase {
  constructor(
    @Inject(SUBSCRIPTION_OPS_REPOSITORY) private readonly overlays: SubscriptionOpsRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AddNoteCommand): Promise<void> {
    const now = this.clock.now();
    const overlay = await ensureSubscriptionOverlay(
      this.overlays,
      this.ids,
      command.subscriptionId,
      now,
    );
    overlay.addNote(command.body, command.adminId, command.authorName, now);
    await this.overlays.save(overlay);
  }
}
