import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { INCIDENT_CATEGORY_LABELS } from '../../domain/incident-category.enum';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import {
  INCIDENT_DETAIL_READ_MODEL,
  IncidentDetailReadModel,
} from '../ports/incident-detail-read.port';
import { IncidentDetailResult } from '../dto/incident-detail.result';
import { incidentNumber } from '../incident-presenter';
import {
  ageInYears,
  dateTimeLabel,
  incidentStatusLabel,
  scheduleLabel,
  severityPriorityLabel,
  titleCase,
  visitReference,
} from '../incident-detail-presenter';

/** The Incident Detail (Overview tab): the incident with its recipient, caregiver and visit. */
@Injectable()
export class GetIncidentDetailUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(INCIDENT_DETAIL_READ_MODEL) private readonly reads: IncidentDetailReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(incidentId: string): Promise<IncidentDetailResult> {
    const incident = await this.incidents.findById(incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    const now = this.clock.now();

    const enrichment = await this.reads.enrich({
      recipientId: incident.relatedCareRecipientId,
      caregiverId: incident.relatedCaregiverId,
      visitId: incident.relatedVisitId,
      coordinatorAdminId: incident.assignedCoordinatorAdminId,
    });

    const recipient = enrichment.recipient;
    const visit = enrichment.visit;

    return {
      id: incident.id,
      reference: incidentNumber(incident.sequence, incident.createdAt),
      incidentType: INCIDENT_CATEGORY_LABELS[incident.category],
      priorityLabel: severityPriorityLabel(incident.severity),
      statusLabel: incidentStatusLabel(incident.status),
      active: incident.active,
      reportedBy: incident.reporterName ?? 'Unknown',
      reportedTime: dateTimeLabel(incident.createdAt),
      reportedAt: incident.createdAt.toISOString(),
      description: incident.detail,
      assignedCoordinator: enrichment.coordinatorName,
      recipient:
        recipient === null
          ? null
          : {
              name: recipient.name,
              age: ageInYears(recipient.dateOfBirth, now),
              primaryLanguage: null,
              emergencyContact: emergencyContact(recipient.ownerName, recipient.ownerPhone),
              diagnosedConditions: [...recipient.medicalConditions, ...recipient.allergies],
            },
      caregiver:
        enrichment.caregiver === null
          ? null
          : {
              name: enrichment.caregiver.name,
              designation: enrichment.caregiver.designation,
              phone: enrichment.caregiver.phone,
            },
      relatedVisit:
        visit === null
          ? null
          : {
              reference: visitReference(visit.sequence, visit.scheduledDate),
              scheduleLabel: scheduleLabel(visit.scheduledDate, visit.startMinute, visit.endMinute),
              serviceType: titleCase(visit.visitType),
              statusLabel: titleCase(visit.status),
            },
      generatedAt: now.toISOString(),
    };
  }
}

function emergencyContact(name: string | null, phone: string | null): string | null {
  if (name === null && phone === null) {
    return null;
  }
  if (name === null) {
    return phone;
  }
  return phone === null ? name : `${name} • ${phone}`;
}
