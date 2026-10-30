import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { IncidentTimelineEventKind } from '../../domain/incident-timeline-event-kind.enum';
import { IncidentTimelineEvent } from '../../domain/incident-timeline-event.entity';
import { INCIDENT_REPOSITORY, IncidentRepository } from '../../domain/incident.repository';
import {
  INCIDENT_TIMELINE_REPOSITORY,
  IncidentTimelineRepository,
} from '../../domain/incident-timeline.repository';

export interface LogIncidentTimelineEventCommand {
  incidentId: string;
  kind: IncidentTimelineEventKind;
  title: string;
  description: string;
  actorName?: string | null;
  actorRole?: string | null;
  adminId: string;
}

/** Append an entry to an incident's history timeline. */
@Injectable()
export class LogIncidentTimelineEventUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY) private readonly incidents: IncidentRepository,
    @Inject(INCIDENT_TIMELINE_REPOSITORY) private readonly timeline: IncidentTimelineRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: LogIncidentTimelineEventCommand): Promise<void> {
    const incident = await this.incidents.findById(command.incidentId);
    if (incident === null) {
      throw new NotFoundDomainException('Incident not found');
    }
    await this.timeline.append(
      IncidentTimelineEvent.append({
        id: this.ids.generate(),
        incidentId: command.incidentId,
        kind: command.kind,
        title: command.title,
        description: command.description,
        actorName: command.actorName,
        actorRole: command.actorRole,
        authorAdminId: command.adminId,
        now: this.clock.now(),
      }),
    );
  }
}
