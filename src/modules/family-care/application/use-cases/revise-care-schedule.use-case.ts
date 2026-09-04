import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareSchedule } from '@modules/care-recipients/domain/value-objects/care-schedule.vo';

export interface ReviseCareScheduleCommand {
  ownerId: string;
  careRecipientId: string;
  frequency: string;
  estimatedStartDate: string;
  expectedDuration: string;
  days?: string[];
  startMinute?: number | null;
  visitDurationMinutes?: number | null;
}

/**
 * Use case: a family owner modifies the care schedule of an active recipient
 * (the Modify Schedule action). Owner scoped. The schedule must already have been
 * set up during onboarding; this replaces the recurring pattern, start time and
 * visit duration without touching onboarding progress.
 */
@Injectable()
export class ReviseCareScheduleUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ReviseCareScheduleCommand): Promise<void> {
    const recipient = await this.recipients.findById(command.careRecipientId);
    if (recipient === null || recipient.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const schedule = CareSchedule.create({
      frequency: command.frequency,
      estimatedStartDate: new Date(command.estimatedStartDate),
      expectedDuration: command.expectedDuration,
      days: command.days,
      startMinute: command.startMinute,
      visitDurationMinutes: command.visitDurationMinutes,
    });

    recipient.reviseSchedule(schedule, this.clock.now());
    await this.recipients.save(recipient);
  }
}
