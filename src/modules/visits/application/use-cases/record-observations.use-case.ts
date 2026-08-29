import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitObservation } from '../../domain/value-objects/visit-observation.vo';
import { VisitObservationsResult, toVisitObservationsResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface RecordObservationsCommand {
  caregiverId: string;
  visitId: string;
  mood?: string | null;
  appetite?: string | null;
  mobility?: string | null;
  medicationStatus?: string | null;
}

/**
 * Use case: a caregiver records their qualitative observations for a visit (mood,
 * appetite, mobility, whether medication was taken). Replaces the visit's single
 * observation record.
 */
@Injectable()
export class RecordObservationsUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RecordObservationsCommand): Promise<VisitObservationsResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    const observation = VisitObservation.create({
      mood: command.mood,
      appetite: command.appetite,
      mobility: command.mobility,
      medicationStatus: command.medicationStatus,
    });
    visit.setObservations(observation, this.clock.now());
    await this.visits.save(visit);

    return toVisitObservationsResult(visit);
  }
}
