import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeofenceConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Coordinates } from '@shared/domain/coordinates.vo';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VisitAttendanceResult, toVisitAttendance } from '../dto/visit-attendance.result';
import {
  CARE_RECIPIENT_DIRECTORY,
  CareRecipientDirectory,
} from '../ports/care-recipient-directory.port';

export interface ClockInVisitCommand {
  caregiverId: string;
  visitId: string;
  latitude: number;
  longitude: number;
}

/**
 * Use case: a caregiver clocks in on arrival at one of their own visits.
 *
 * The caregiver's current position is checked against the geofence around the
 * recipient's pinned address (radius from config). A visit that does not exist
 * or belongs to another caregiver is reported as not found, so nothing leaks. On
 * success the visit starts and the server stamps the arrival time and location.
 */
@Injectable()
export class ClockInVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_DIRECTORY) private readonly recipients: CareRecipientDirectory,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ClockInVisitCommand): Promise<VisitAttendanceResult> {
    const visit = await this.visits.findById(command.visitId);
    if (visit === null || visit.caregiverId !== command.caregiverId) {
      throw new NotFoundDomainException('Visit not found');
    }

    const snapshots = await this.recipients.lookup([visit.careRecipientId]);
    const recipient = snapshots.get(visit.careRecipientId);
    if (recipient === undefined) {
      throw new NotFoundDomainException('Visit not found');
    }
    if (recipient.latitude === null || recipient.longitude === null) {
      throw new ValidationException(
        'This care recipient has no pinned address location, so arrival cannot be verified',
      );
    }

    const radiusMeters = this.config.getOrThrow<GeofenceConfig>('geofence').radiusMeters;

    visit.clockIn({
      at: Coordinates.create(command.latitude, command.longitude),
      geofenceCenter: Coordinates.create(recipient.latitude, recipient.longitude),
      radiusMeters,
      now: this.clock.now(),
    });

    await this.visits.save(visit);
    return toVisitAttendance(visit);
  }
}
