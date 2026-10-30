import { Inject, Injectable } from '@nestjs/common';
import { SosAlert } from '@modules/visits/domain/sos-alert.entity';
import { SosAlertStatus } from '@modules/visits/domain/sos-alert-status.enum';
import {
  SOS_ALERT_REPOSITORY,
  SosAlertRepository,
} from '@modules/visits/domain/sos-alert.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { EMERGENCY_PROTOCOL } from '../../domain/emergency-protocol-step.enum';
import {
  EMERGENCY_RESPONSE_REPOSITORY,
  EmergencyResponseRepository,
} from '../../domain/emergency-response.repository';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import { SosProtocolCompletion } from '../../domain/sos-protocol-completion.entity';
import { SosResponseEvent } from '../../domain/sos-response-event.entity';
import {
  EMERGENCY_ENRICHMENT_READ_MODEL,
  EmergencyEnrichmentReadModel,
} from '../ports/emergency-enrichment-read.port';
import {
  EmergencyDetailResult,
  EmergencyTimelineEntryResult,
} from '../dto/emergency-detail.result';
import { incidentNumber } from '../incident-presenter';
import { clockLabel, durationLabel } from '../emergency-presenter';

/** The Emergencies tab detail for one caregiver SOS: details, protocol and timeline. */
@Injectable()
export class GetEmergencyDetailUseCase {
  constructor(
    @Inject(SOS_ALERT_REPOSITORY) private readonly sos: SosAlertRepository,
    @Inject(EMERGENCY_RESPONSE_REPOSITORY) private readonly response: EmergencyResponseRepository,
    @Inject(EMERGENCY_ENRICHMENT_READ_MODEL) private readonly reads: EmergencyEnrichmentReadModel,
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(sosAlertId: string): Promise<EmergencyDetailResult> {
    const alert = await this.sos.findById(sosAlertId);
    if (alert === null) {
      throw new NotFoundDomainException('Emergency not found');
    }
    const now = this.clock.now();

    const [enrichment, completions, events] = await Promise.all([
      this.reads.enrich(alert.caregiverId, alert.visitId),
      this.response.listCompletions(sosAlertId),
      this.response.listEvents(sosAlertId),
    ]);

    const completed = new Set(completions.map((c) => c.step));
    const protocol = EMERGENCY_PROTOCOL.map(({ step, label }) => ({
      step,
      label,
      completed: completed.has(step),
    }));

    const timeline = this.buildTimeline(alert, enrichment.caregiverName, completions, events);
    const reference = await this.resolveReference(alert, events);

    return {
      id: alert.id,
      reference,
      title: 'Caregiver Emergency SOS Triggered',
      statusLabel: statusLabel(alert),
      critical: alert.status === SosAlertStatus.Active,
      details: {
        caregiver: enrichment.caregiverName ?? 'Unknown',
        careRecipient: alert.recipient.name ?? 'Unknown',
        visit: enrichment.visitService ?? 'Unknown',
        location: alert.recipient.address ?? 'Unknown',
        timeTriggered: clockLabel(alert.createdAt),
        triggeredAt: alert.createdAt.toISOString(),
        durationLabel: durationLabel(alert.createdAt, now),
        assignedTo: alert.assignedTo,
      },
      protocol,
      timeline,
      generatedAt: now.toISOString(),
    };
  }

  private buildTimeline(
    alert: SosAlert,
    caregiverName: string | null,
    completions: SosProtocolCompletion[],
    events: SosResponseEvent[],
  ): EmergencyTimelineEntryResult[] {
    const entries: { at: Date; description: string; kind: string }[] = [
      {
        at: alert.createdAt,
        description: `${caregiverName ?? 'Caregiver'} pressed the SOS button.`,
        kind: 'RAISED',
      },
    ];
    if (alert.acknowledgedAt !== null) {
      entries.push({
        at: alert.acknowledgedAt,
        description: 'Emergency acknowledged by the coordinator.',
        kind: 'ACKNOWLEDGED',
      });
      if (alert.assignedTo !== null) {
        entries.push({
          at: alert.acknowledgedAt,
          description: `Response assigned to ${alert.assignedTo}.`,
          kind: 'ASSIGNED',
        });
      }
    } else if (alert.dispatchedAt !== null) {
      entries.push({
        at: alert.dispatchedAt,
        description: 'Emergency response dispatched.',
        kind: 'DISPATCHED',
      });
    }
    if (alert.cancelledAt !== null) {
      entries.push({
        at: alert.cancelledAt,
        description: 'Alert cancelled.',
        kind: 'CANCELLED',
      });
    }
    for (const completion of completions) {
      const step = EMERGENCY_PROTOCOL.find((s) => s.step === completion.step);
      entries.push({
        at: completion.completedAt,
        description: `Protocol step completed: ${step?.label ?? completion.step}.`,
        kind: 'STEP_COMPLETED',
      });
    }
    for (const event of events) {
      entries.push({ at: event.at, description: event.description, kind: event.kind });
    }

    return entries
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((e) => ({
        at: e.at.toISOString(),
        timeLabel: clockLabel(e.at),
        description: e.description,
        kind: e.kind,
      }));
  }

  private async resolveReference(alert: SosAlert, events: SosResponseEvent[]): Promise<string> {
    const linked = events.filter((e) => e.linkedIncidentId !== null);
    const latest = linked[linked.length - 1];
    if (latest?.linkedIncidentId) {
      const incident = await this.incidents.findById(latest.linkedIncidentId);
      if (incident !== null) {
        return incidentNumber(incident.sequence, incident.createdAt);
      }
    }
    return `SOS-${alert.id.slice(0, 8).toUpperCase()}`;
  }
}

function statusLabel(alert: SosAlert): string {
  if (alert.status === SosAlertStatus.Cancelled) {
    return 'Cancelled';
  }
  return alert.acknowledgedAt === null ? 'New / Unresolved' : 'Acknowledged';
}
