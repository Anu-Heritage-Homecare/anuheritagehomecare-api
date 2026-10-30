import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { COMMUNICATION_CHANNEL_LABELS } from '../../domain/communication-channel.enum';
import { COMMUNICATION_OUTCOME_LABELS } from '../../domain/communication-outcome.enum';
import { IncidentCommunication } from '../../domain/incident-communication.entity';
import {
  INCIDENT_COMMUNICATION_REPOSITORY,
  IncidentCommunicationRepository,
} from '../../domain/incident-communication.repository';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import {
  INCIDENT_DETAIL_READ_MODEL,
  IncidentDetailReadModel,
} from '../ports/incident-detail-read.port';
import {
  IncidentCommunicationRowResult,
  IncidentCommunicationsResult,
  QuickContactBookResult,
} from '../dto/incident-communications.result';
import { clockLabel } from '../emergency-presenter';
import { dateTimeLabel, dayLabel } from '../incident-detail-presenter';
import { incidentNumber } from '../incident-presenter';

/** The Incident Detail Communication tab: the communication log and the Quick Contact Book. */
@Injectable()
export class GetIncidentCommunicationsUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(INCIDENT_COMMUNICATION_REPOSITORY)
    private readonly communications: IncidentCommunicationRepository,
    @Inject(INCIDENT_DETAIL_READ_MODEL) private readonly reads: IncidentDetailReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(incidentId: string): Promise<IncidentCommunicationsResult> {
    const incident = await this.incidents.findById(incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    const now = this.clock.now();

    const [rows, enrichment] = await Promise.all([
      this.communications.listForIncident(incidentId),
      this.reads.enrich({
        recipientId: incident.relatedCareRecipientId,
        caregiverId: incident.relatedCaregiverId,
        visitId: null,
        coordinatorAdminId: null,
      }),
    ]);

    return {
      id: incident.id,
      reference: incidentNumber(incident.sequence, incident.createdAt),
      communications: rows.map((row) => this.toRow(row, now)),
      contactBook: this.contactBook(enrichment),
      generatedAt: now.toISOString(),
    };
  }

  private toRow(row: IncidentCommunication, now: Date): IncidentCommunicationRowResult {
    return {
      id: row.id,
      at: row.at.toISOString(),
      timeLabel: clockLabel(row.at),
      dayLabel: dayLabel(row.at, now),
      timestampLabel: dateTimeLabel(row.at),
      contactName: row.contactName,
      contactRole: row.contactRole,
      channel: String(row.channel),
      channelLabel: COMMUNICATION_CHANNEL_LABELS[row.channel],
      outcome: String(row.outcome),
      outcomeLabel: COMMUNICATION_OUTCOME_LABELS[row.outcome],
      notes: row.notes,
    };
  }

  private contactBook(
    enrichment: Awaited<ReturnType<IncidentDetailReadModel['enrich']>>,
  ): QuickContactBookResult {
    const recipient = enrichment.recipient;
    const caregiver = enrichment.caregiver;
    return {
      familyEmergencyContact:
        recipient === null || recipient.ownerName === null
          ? null
          : {
              name: recipient.ownerName,
              subtitle: recipient.relationship,
              phone: recipient.ownerPhone,
            },
      assignedCaregiver:
        caregiver === null
          ? null
          : { name: caregiver.name, subtitle: caregiver.designation, phone: caregiver.phone },
      escalationSupervisor:
        caregiver === null || caregiver.supervisorName === null
          ? null
          : { name: caregiver.supervisorName, subtitle: null, phone: null },
    };
  }
}
