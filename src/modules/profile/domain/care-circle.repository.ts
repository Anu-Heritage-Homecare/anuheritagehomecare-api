import { CareCircleMember } from './care-circle-member.entity';

/** Persistence port for a family owner's care circle members. */
export interface CareCircleRepository {
  /** The owner's approved (ACTIVE) members, for the care circle view. */
  listForOwner(ownerId: string): Promise<CareCircleMember[]>;
  /** The owner's PENDING join requests awaiting approval, oldest first. */
  listPendingForOwner(ownerId: string): Promise<CareCircleMember[]>;
  findById(id: string): Promise<CareCircleMember | null>;
  /**
   * The membership linking a user to an owner's circle, or null when none.
   * Returns the row whatever its status, so callers can distinguish a pending
   * request from an active member.
   */
  findMembership(ownerId: string, memberUserId: string): Promise<CareCircleMember | null>;
  save(member: CareCircleMember): Promise<void>;
  /** Owner scoped delete; a no op if the id does not belong to the owner. */
  delete(ownerId: string, id: string): Promise<void>;
}

export const CARE_CIRCLE_REPOSITORY = Symbol('CARE_CIRCLE_REPOSITORY');
