import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { Coordinates } from '@shared/domain/coordinates.vo';
import { LocationPing } from '../../domain/location-ping.entity';
import {
  LOCATION_PING_REPOSITORY,
  LocationPingRepository,
} from '../../domain/location-ping.repository';
import { IngestLocationsCommand } from '../commands/ingest-locations.command';

/** Result of an ingestion: how many points were newly stored (a replay stores fewer). */
export interface IngestLocationsResult {
  accepted: number;
}

/**
 * Use case: store a batch of location breadcrumbs for the authenticated
 * caregiver. Each point is validated (coordinates, accuracy, device time) and
 * stamped with a single server receive time for the batch, then written in one
 * bulk insert. The caregiver id is trusted from the token; a visit id is only a
 * tag and is not verified here, keeping this high volume path cheap. The write is
 * idempotent on each point's client id, so a replayed offline batch stores only
 * the points not already saved.
 */
@Injectable()
export class IngestLocationsUseCase {
  constructor(
    @Inject(LOCATION_PING_REPOSITORY) private readonly pings: LocationPingRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: IngestLocationsCommand): Promise<IngestLocationsResult> {
    const receivedAt = this.clock.now();

    const pings = command.points.map((point) =>
      LocationPing.record({
        id: this.ids.generate(),
        caregiverId: command.caregiverId,
        clientId: point.clientId,
        visitId: point.visitId ?? null,
        sosAlertId: point.sosAlertId ?? null,
        position: Coordinates.create(point.latitude, point.longitude),
        accuracyMeters: point.accuracyMeters ?? null,
        mode: point.mode,
        recordedAt: new Date(point.recordedAt),
        receivedAt,
      }),
    );

    const accepted = await this.pings.saveMany(pings);
    return { accepted };
  }
}
