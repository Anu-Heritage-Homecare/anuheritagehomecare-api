import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';

export interface AssignCaregiverCommand {
  visitId: string;
  caregiverId: string;
}

export interface AssignCaregiverResult {
  visitId: string;
  caregiverId: string;
  assignedAt: Date;
}

/**
 * Use case: an admin assigns (or reassigns) a caregiver to a visit from the
 * operations dashboard. The caregiver must be a real caregiver account, and the
 * visit must still be schedulable (the aggregate enforces that only a scheduled
 * visit can be assigned).
 */
@Injectable()
export class AssignCaregiverUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AssignCaregiverCommand): Promise<AssignCaregiverResult> {
    const visit = await this.visits.findById(command.visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }

    const caregiver = await this.users.findById(command.caregiverId);
    if (caregiver === null || caregiver.userType !== UserType.Caregiver) {
      throw new ValidationException('The assigned user is not a caregiver');
    }

    const now = this.clock.now();
    visit.assignCaregiver(command.caregiverId, now);
    await this.visits.save(visit);

    return { visitId: visit.id, caregiverId: command.caregiverId, assignedAt: now };
  }
}
