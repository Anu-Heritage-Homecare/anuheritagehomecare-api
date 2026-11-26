import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';

export interface ReassignRecipientVisitsCommand {
  careRecipientId: string;
  fromCaregiverId: string;
  /** The caregiver to move the visits to, or null to leave them Unassigned. */
  toCaregiverId: string | null;
}

export interface ReassignRecipientVisitsResult {
  updated: number;
}

// Future visits are considered from the start of today onward; past and in
// progress visits are never touched, so history stays intact.
const HORIZON_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Move or release a care recipient's upcoming visits when a caregiver leaves or
 * is swapped on the care team. Only scheduled (not started) visits from today
 * onward are affected; each is reassigned to the new caregiver, or unassigned
 * when none is given.
 */
@Injectable()
export class ReassignRecipientVisitsUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ReassignRecipientVisitsCommand): Promise<ReassignRecipientVisitsResult> {
    if (command.toCaregiverId === command.fromCaregiverId) {
      throw new ValidationException('The new caregiver must be different from the current one');
    }
    if (command.toCaregiverId !== null) {
      const caregiver = await this.users.findById(command.toCaregiverId);
      if (caregiver === null || caregiver.userType !== UserType.Caregiver) {
        throw new ValidationException('The assigned user is not a caregiver');
      }
    }

    const now = this.clock.now();
    const from = startOfUtcDay(now);
    const to = new Date(from.getTime() + HORIZON_DAYS * DAY_MS);
    const visits = await this.visits.listForCareRecipientsInRange(
      [command.careRecipientId],
      from,
      to,
    );

    const target = visits.filter(
      (visit) =>
        visit.status === VisitStatus.Scheduled && visit.caregiverId === command.fromCaregiverId,
    );

    for (const visit of target) {
      if (command.toCaregiverId === null) {
        visit.unassignCaregiver(now);
      } else {
        visit.assignCaregiver(command.toCaregiverId, now);
      }
      await this.visits.save(visit);
    }

    return { updated: target.length };
  }
}
