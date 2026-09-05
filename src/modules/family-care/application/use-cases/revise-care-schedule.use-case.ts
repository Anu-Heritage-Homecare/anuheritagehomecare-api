import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareSchedule } from '@modules/care-recipients/domain/value-objects/care-schedule.vo';
import { CareAccessLevel } from '@modules/profile/domain/care-access-level.enum';
import { CARE_ACCESS, CareAccessGuard } from '@modules/profile/application/ports/care-access.port';

export interface ReviseCareScheduleCommand {
  /** The authenticated caller: the owner, or a full access care circle member. */
  callerUserId: string;
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
    @Inject(CARE_ACCESS) private readonly access: CareAccessGuard,
  ) {}

  async execute(command: ReviseCareScheduleCommand): Promise<void> {
    const recipient = await this.recipients.findById(command.careRecipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    await this.access.assertAccess(command.callerUserId, recipient.ownerId, CareAccessLevel.Full);

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
