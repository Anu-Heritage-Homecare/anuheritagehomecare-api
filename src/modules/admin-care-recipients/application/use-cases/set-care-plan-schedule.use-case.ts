import { Inject, Injectable } from '@nestjs/common';
import { CarePlanRevision } from '@modules/care-recipients/domain/care-plan-revision.entity';
import {
  CARE_PLAN_REVISION_REPOSITORY,
  CarePlanRevisionRepository,
} from '@modules/care-recipients/domain/care-plan-revision.repository';
import { CarePlanScheduleBlock } from '@modules/care-recipients/domain/care-plan-schedule-block.entity';
import {
  CARE_PLAN_SCHEDULE_REPOSITORY,
  CarePlanScheduleRepository,
} from '@modules/care-recipients/domain/care-plan-schedule-block.repository';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetCarePlanScheduleCommand {
  recipientId: string;
  adminId: string;
  revisionNote?: string;
  blocks: { startMinute: number; title: string; description: string }[];
}

/**
 * Use case: replace a recipient's daily care schedule from the admin editor and
 * record a revision. Blocks are stored in the order given.
 */
@Injectable()
export class SetCarePlanScheduleUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_PLAN_SCHEDULE_REPOSITORY) private readonly schedule: CarePlanScheduleRepository,
    @Inject(CARE_PLAN_REVISION_REPOSITORY) private readonly revisions: CarePlanRevisionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetCarePlanScheduleCommand): Promise<{ blockCount: number }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    const blocks = command.blocks.map((block, index) =>
      CarePlanScheduleBlock.create({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        startMinute: block.startMinute,
        title: block.title,
        description: block.description,
        position: index,
      }),
    );
    await this.schedule.replaceForRecipient(command.recipientId, blocks);
    await this.revisions.add(
      CarePlanRevision.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        description: command.revisionNote?.trim() || 'Daily care schedule updated',
        authorAdminId: command.adminId,
        now: this.clock.now(),
      }),
    );
    return { blockCount: blocks.length };
  }
}
