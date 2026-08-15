import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { ALL_CARE_NEEDS, CareNeed } from '../../domain/care-need.enum';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { UpdateCareNeedsCommand } from '../commands/update-care-needs.command';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';
import { loadOwnedCareRecipient } from '../load-owned-care-recipient';

/** Use case: record the care needs selected on the second onboarding step. */
@Injectable()
export class UpdateCareNeedsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateCareNeedsCommand): Promise<CareRecipientResult> {
    const needs = command.careNeeds.map((value) => UpdateCareNeedsUseCase.toCareNeed(value));

    const recipient = await loadOwnedCareRecipient(
      this.repository,
      command.careRecipientId,
      command.ownerId,
    );
    recipient.setCareNeeds(needs, this.clock.now());
    await this.repository.save(recipient);

    return toCareRecipientResult(recipient);
  }

  private static toCareNeed(raw: string): CareNeed {
    const normalised = raw.trim().toUpperCase();
    const match = ALL_CARE_NEEDS.find((need) => String(need) === normalised);
    if (match === undefined) {
      throw new ValidationException(`Unknown care need: ${raw}`);
    }
    return match;
  }
}
