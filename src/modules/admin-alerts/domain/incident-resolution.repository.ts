import { IncidentResolution } from './incident-resolution.entity';

/** Persistence port for an incident's resolution form (one per incident). */
export interface IncidentResolutionRepository {
  findByIncident(incidentId: string): Promise<IncidentResolution | null>;
  /** Upsert the resolution draft for its incident. */
  save(resolution: IncidentResolution): Promise<void>;
}

export const INCIDENT_RESOLUTION_REPOSITORY = Symbol('INCIDENT_RESOLUTION_REPOSITORY');
