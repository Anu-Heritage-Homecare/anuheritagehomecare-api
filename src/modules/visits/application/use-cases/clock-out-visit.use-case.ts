import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitAttendanceResult, toVisitAttendance } from '../dto/visit-attendance.result';

export interface ClockOutVisitCommand {
  caregiverId: string;
  visitId: string;
}

/**
 * Use case: a caregiver clocks out of a visit that is under way, completing it.
 * A visit that does not exist or belongs to another caregiver is reported as not
 * found. The server stamps the clock out time, which is the source of truth for
 * how long the visit took.
 */
@Injectable()
export class ClockOutVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ClockOutVisitCommand): Promise<VisitAttendanceResult> {
    const visit = await this.visits.findById(command.visitId);
    if (visit === null || visit.caregiverId !== command.caregiverId) {
      throw new NotFoundDomainException('Visit not found');
    }

    visit.clockOut(this.clock.now());
    await this.visits.save(visit);
    return toVisitAttendance(visit);
  }
}
