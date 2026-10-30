import { IncidentTimelineEvent } from './incident-timeline-event.entity';

/** Persistence port for an incident's appended timeline events. */
export interface IncidentTimelineRepository {
  /** The appended events for an incident, oldest first. */
  listForIncident(incidentId: string): Promise<IncidentTimelineEvent[]>;
  append(event: IncidentTimelineEvent): Promise<void>;
}

export const INCIDENT_TIMELINE_REPOSITORY = Symbol('INCIDENT_TIMELINE_REPOSITORY');
