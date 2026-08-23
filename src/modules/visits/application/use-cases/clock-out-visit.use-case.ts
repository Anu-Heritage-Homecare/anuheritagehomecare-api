import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitCompletionResult, toVisitCompletion } from '../dto/visit-completion.result';
import { loadOwnedVisit } from '../load-owned-visit';
import {
  CARE_RECIPIENT_DIRECTORY,
  CareRecipientDirectory,
} from '../ports/care-recipient-directory.port';

export interface ClockOutVisitCommand {
  caregiverId: string;
  visitId: string;
}

/**
 * Use case: a caregiver clocks out of a visit that is under way, completing it.
 * This is the submit at the end of the review flow. A visit that does not exist
 * or belongs to another caregiver is reported as not found. The server stamps the
 * clock out time, which is the source of truth for how long the visit took, and
 * the response carries the recipient and the time breakdown for the confirmation
 * screen.
 */
@Injectable()
export class ClockOutVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_DIRECTORY) private readonly recipients: CareRecipientDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ClockOutVisitCommand): Promise<VisitCompletionResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    visit.clockOut(this.clock.now());
    await this.visits.save(visit);

    const snapshots = await this.recipients.lookup([visit.careRecipientId]);
    const recipient = snapshots.get(visit.careRecipientId);
    return toVisitCompletion(visit, recipient?.name ?? null);
  }
}
