import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { CareSchedule } from '../../domain/value-objects/care-schedule.vo';
import { UpdateCareScheduleCommand } from '../commands/update-care-schedule.command';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';
import { loadOwnedCareRecipient } from '../load-owned-care-recipient';

/** Use case: record the care schedule captured on the fourth onboarding step. */
@Injectable()
export class UpdateCareScheduleUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateCareScheduleCommand): Promise<CareRecipientResult> {
    const estimatedStartDate = new Date(command.estimatedStartDate);
    this.assertNotInPast(estimatedStartDate);

    const schedule = CareSchedule.create({
      frequency: command.frequency,
      estimatedStartDate,
      expectedDuration: command.expectedDuration,
    });

    const recipient = await loadOwnedCareRecipient(
      this.repository,
      command.careRecipientId,
      command.ownerId,
    );
    recipient.setSchedule(schedule, this.clock.now());
    await this.repository.save(recipient);

    return toCareRecipientResult(recipient);
  }

  private assertNotInPast(startDate: Date): void {
    if (Number.isNaN(startDate.getTime())) {
      // The value object raises the detailed error; guard here only to compare safely.
      return;
    }
    const now = this.clock.now();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (startDate.getTime() < todayUtc) {
      throw new ValidationException('Estimated start date cannot be in the past');
    }
  }
}
