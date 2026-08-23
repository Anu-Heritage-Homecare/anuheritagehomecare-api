import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { Coordinates } from '@shared/domain/coordinates.vo';
import { SosAlert, SosRecipientSnapshot } from '../../domain/sos-alert.entity';
import { SOS_ALERT_REPOSITORY, SosAlertRepository } from '../../domain/sos-alert.repository';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { SosAlertResult, toSosAlertResult } from '../dto/sos-alert.result';
import { loadOwnedVisit } from '../load-owned-visit';
import {
  CARE_RECIPIENT_DIRECTORY,
  CareRecipientDirectory,
} from '../ports/care-recipient-directory.port';

export interface RaiseSosCommand {
  caregiverId: string;
  visitId: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Use case: a caregiver raises an SOS from an active shift. The visit must exist
 * and belong to the caregiver. The caregiver's current position and a snapshot of
 * the care recipient (name, address, pinned location) are captured onto the alert
 * so a responder can act on it, and a high signal log line is emitted. The
 * coordinates, recipient name and address are sensitive and are kept out of the
 * log. Recipient details are best effort: a missing lookup never blocks the alert.
 */
@Injectable()
export class RaiseSosUseCase {
  private readonly logger = new Logger(RaiseSosUseCase.name);

  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(SOS_ALERT_REPOSITORY) private readonly alerts: SosAlertRepository,
    @Inject(CARE_RECIPIENT_DIRECTORY) private readonly recipients: CareRecipientDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: RaiseSosCommand): Promise<SosAlertResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    const hasPosition =
      command.latitude !== null &&
      command.latitude !== undefined &&
      command.longitude !== null &&
      command.longitude !== undefined;
    const position = hasPosition
      ? Coordinates.create(command.latitude as number, command.longitude as number)
      : null;

    const recipient = await this.snapshotRecipient(visit.careRecipientId);

    const alert = SosAlert.raise({
      id: this.ids.generate(),
      caregiverId: command.caregiverId,
      visitId: command.visitId,
      position,
      recipient,
      now: this.clock.now(),
    });
    await this.alerts.save(alert);

    // High signal, but never log the coordinates, recipient name or address.
    this.logger.warn({
      event: 'sos_raised',
      alertId: alert.id,
      caregiverId: alert.caregiverId,
      visitId: alert.visitId,
      careRecipientId: recipient.careRecipientId,
      hasPosition,
    });

    return toSosAlertResult(alert);
  }

  private async snapshotRecipient(careRecipientId: string): Promise<SosRecipientSnapshot> {
    const snapshots = await this.recipients.lookup([careRecipientId]);
    const recipient = snapshots.get(careRecipientId);
    if (recipient === undefined) {
      return { careRecipientId, name: null, address: null, location: null };
    }
    const location =
      recipient.latitude === null || recipient.longitude === null
        ? null
        : Coordinates.create(recipient.latitude, recipient.longitude);
    return {
      careRecipientId,
      name: recipient.name,
      address: recipient.fullAddress,
      location,
    };
  }
}
