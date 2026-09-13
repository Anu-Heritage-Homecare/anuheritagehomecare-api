import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CoverageBlock } from '@modules/care-recipients/domain/coverage-block.entity';
import {
  COVERAGE_BLOCK_REPOSITORY,
  CoverageBlockRepository,
} from '@modules/care-recipients/domain/coverage-block.repository';
import { CoverageSlot } from '@modules/care-recipients/domain/coverage-slot.enum';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetCoverageCommand {
  recipientId: string;
  blocks: { weekday: Weekday; slot: CoverageSlot; caregiverId?: string | null }[];
}

/**
 * Use case: the admin sets a recipient's recurring weekly coverage grid. Captured
 * as a set and replaced wholesale; a block may be left open (no caregiver).
 */
@Injectable()
export class SetCoverageUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(COVERAGE_BLOCK_REPOSITORY) private readonly coverage: CoverageBlockRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetCoverageCommand): Promise<{ blockCount: number }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const blocks = command.blocks.map((block) =>
      CoverageBlock.create({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        weekday: block.weekday,
        slot: block.slot,
        caregiverId: block.caregiverId ?? null,
      }),
    );
    await this.coverage.replaceForRecipient(command.recipientId, blocks);
    return { blockCount: blocks.length };
  }
}
