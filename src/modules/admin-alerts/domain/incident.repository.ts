import { Incident } from './incident.entity';

/**
 * Persistence port for reported incidents. Creating one assigns its display
 * sequence; the screen reads the active incidents plus those recently resolved.
 */
export interface IncidentRepository {
  /** Insert a new incident and return it with its store assigned `sequence`. */
  create(incident: Incident): Promise<Incident>;
  /** Persist a status change (resolve or close) on an existing incident. */
  save(incident: Incident): Promise<void>;
  findById(id: string): Promise<Incident | null>;
  /**
   * The Incidents tab set: every open incident plus any resolved or closed since
   * `resolvedSince`, most recent first, capped at `limit`.
   */
  listForOverview(resolvedSince: Date, limit: number): Promise<Incident[]>;
  /** Incidents resolved or closed at or after `since`, most recently resolved first. */
  listResolvedSince(since: Date, limit: number): Promise<Incident[]>;
}

export const INCIDENT_REPOSITORY = Symbol('INCIDENT_REPOSITORY');
