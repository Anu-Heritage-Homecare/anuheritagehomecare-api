import { Inject, Injectable } from '@nestjs/common';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import {
  EMERGENCY_RESPONSE_REPOSITORY,
  EmergencyResponseRepository,
} from '../../domain/emergency-response.repository';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { SosResponseEvent } from '../../domain/sos-response-event.entity';
import { SosResponseEventKind } from '../../domain/sos-response-event-kind.enum';
import { ReportIncidentUseCase } from './report-incident.use-case';

export interface LogResponseEventCommand {
  sosAlertId: string;
  kind: SosResponseEventKind;
  description?: string | null;
  adminId: string;
}

/**
 * Append an entry to an SOS emergency's timeline. For an INCIDENT_LOGGED entry a
 * real incident is filed (reusing the incident report flow) and linked, so the
 * emergency's reference becomes that incident's number.
 */
@Injectable()
export class LogResponseEventUseCase {
  constructor(
    @Inject(SOS_ALERT_REPOSITORY) private readonly sos: SosAlertRepository,
    @Inject(EMERGENCY_RESPONSE_REPOSITORY) private readonly response: EmergencyResponseRepository,
    private readonly reportIncident: ReportIncidentUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: LogResponseEventCommand): Promise<void> {
    const alert = await this.sos.findById(command.sosAlertId);
    if (alert === null) {
      throw new NotFoundDomainException('Emergency not found');
    }

    let linkedIncidentId: string | null = null;
    let description = command.description?.trim() ?? '';

    if (command.kind === SosResponseEventKind.IncidentLogged) {
      const incident = await this.reportIncident.execute({
        category: IncidentCategory.Other,
        severity: AlertSeverity.Critical,
        detail: description.length > 0 ? description : 'Incident logged from an SOS emergency',
        reportedByAdminId: command.adminId,
        relatedCareRecipientId: alert.recipient.careRecipientId,
        relatedVisitId: alert.visitId,
        relatedCaregiverId: alert.caregiverId,
      });
      linkedIncidentId = incident.id;
      description = `Incident report ${incident.incidentId} created.`;
    }

    await this.response.appendEvent(
      SosResponseEvent.append({
        id: this.ids.generate(),
        sosAlertId: command.sosAlertId,
        kind: command.kind,
        description,
        actorAdminId: command.adminId,
        linkedIncidentId,
        now: this.clock.now(),
      }),
    );
  }
}
