import { CareTeamAssignment } from './care-team-assignment.entity';

/**
 * Persistence port for a recipient's care team assignments. Managed individually
 * (assign, revise, remove); reads return the active members.
 */
export interface CareTeamAssignmentRepository {
  add(assignment: CareTeamAssignment): Promise<void>;
  save(assignment: CareTeamAssignment): Promise<void>;
  findById(id: string): Promise<CareTeamAssignment | null>;
  listActiveForRecipient(careRecipientId: string): Promise<CareTeamAssignment[]>;
}

export const CARE_TEAM_ASSIGNMENT_REPOSITORY = Symbol('CARE_TEAM_ASSIGNMENT_REPOSITORY');
