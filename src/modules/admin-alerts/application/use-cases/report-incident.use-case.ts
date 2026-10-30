import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';
import { Incident } from '../../domain/incident.entity';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import { IncidentRowResult } from '../dto/incident.result';
import { toIncidentRow } from '../incident-presenter';

export interface ReportIncidentCommand {
  category: IncidentCategory;
  severity: AlertSeverity;
  detail?: string | null;
  reporterName?: string | null;
  reportedByAdminId: string;
  relatedVisitId?: string | null;
  relatedCaregiverId?: string | null;
  relatedCareRecipientId?: string | null;
}

/** File a new incident. Opens it and assigns its display reference. */
@Injectable()
export class ReportIncidentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ReportIncidentCommand): Promise<IncidentRowResult> {
    const now = this.clock.now();
    const incident = Incident.report({
      id: this.ids.generate(),
      category: command.category,
      severity: command.severity,
      detail: command.detail,
      reporterName: command.reporterName,
      reportedByAdminId: command.reportedByAdminId,
      relatedVisitId: command.relatedVisitId,
      relatedCaregiverId: command.relatedCaregiverId,
      relatedCareRecipientId: command.relatedCareRecipientId,
      now,
    });
    const created = await this.incidents.create(incident);
    return toIncidentRow(created, now);
  }
}
