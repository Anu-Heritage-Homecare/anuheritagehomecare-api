import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitPhotosResult, toVisitPhotosResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface SaveVisitPhotosCommand {
  caregiverId: string;
  visitId: string;
  photoKeys?: string[];
}

/**
 * Use case: a caregiver sets the photo keys attached to their visit. The whole
 * set is replaced on each save. Photo keys are opaque storage references (the
 * upload endpoint is deferred).
 */
@Injectable()
export class SaveVisitPhotosUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SaveVisitPhotosCommand): Promise<VisitPhotosResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    visit.savePhotos({ photoKeys: command.photoKeys, now: this.clock.now() });
    await this.visits.save(visit);

    return toVisitPhotosResult(visit);
  }
}
