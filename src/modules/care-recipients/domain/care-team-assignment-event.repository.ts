import { CareTeamAssignmentEvent } from './care-team-assignment-event.entity';

/**
 * Persistence port for a recipient's caregiver assignment history. Append only: an
 * event is recorded and never mutated; reads return the most recent first.
 */
export interface CareTeamAssignmentEventRepository {
  add(event: CareTeamAssignmentEvent): Promise<void>;
  listForRecipient(careRecipientId: string, limit: number): Promise<CareTeamAssignmentEvent[]>;
}

export const CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY = Symbol(
  'CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY',
);
