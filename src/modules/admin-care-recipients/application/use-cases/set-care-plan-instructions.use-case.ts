import { Inject, Injectable } from '@nestjs/common';
import { CareInstruction } from '@modules/care-recipients/domain/care-instruction.entity';
import {
  CareInstructionCategory,
  CareInstructionSeverity,
} from '@modules/care-recipients/domain/care-instruction.enums';
import {
  CARE_INSTRUCTION_REPOSITORY,
  CareInstructionRepository,
} from '@modules/care-recipients/domain/care-instruction.repository';
import { CarePlanRevision } from '@modules/care-recipients/domain/care-plan-revision.entity';
import {
  CARE_PLAN_REVISION_REPOSITORY,
  CarePlanRevisionRepository,
} from '@modules/care-recipients/domain/care-plan-revision.repository';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetCarePlanInstructionsCommand {
  recipientId: string;
  adminId: string;
  revisionNote?: string;
  instructions: {
    category: CareInstructionCategory;
    text: string;
    severity: CareInstructionSeverity;
  }[];
}

/**
 * Use case: replace a recipient's care instructions (medical needs and behavioral
 * notes) from the admin editor and record a revision. Stored in the order given;
 * the read splits them back into the two columns by category.
 */
@Injectable()
export class SetCarePlanInstructionsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_INSTRUCTION_REPOSITORY) private readonly instructions: CareInstructionRepository,
    @Inject(CARE_PLAN_REVISION_REPOSITORY) private readonly revisions: CarePlanRevisionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetCarePlanInstructionsCommand): Promise<{ instructionCount: number }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    const instructions = command.instructions.map((instruction, index) =>
      CareInstruction.create({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        category: instruction.category,
        text: instruction.text,
        severity: instruction.severity,
        position: index,
      }),
    );
    await this.instructions.replaceForRecipient(command.recipientId, instructions);
    await this.revisions.add(
      CarePlanRevision.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        description: command.revisionNote?.trim() || 'Care instructions updated',
        authorAdminId: command.adminId,
        now: this.clock.now(),
      }),
    );
    return { instructionCount: instructions.length };
  }
}
