import { IncidentCommunication } from './incident-communication.entity';

/** Persistence port for an incident's documented communications. */
export interface IncidentCommunicationRepository {
  /** The communications for an incident, oldest first. */
  listForIncident(incidentId: string): Promise<IncidentCommunication[]>;
  record(communication: IncidentCommunication): Promise<void>;
}

export const INCIDENT_COMMUNICATION_REPOSITORY = Symbol('INCIDENT_COMMUNICATION_REPOSITORY');
