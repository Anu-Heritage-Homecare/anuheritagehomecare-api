import { CareCircleMember } from './care-circle-member.entity';

/** Persistence port for a family owner's care circle members. */
export interface CareCircleRepository {
  listForOwner(ownerId: string): Promise<CareCircleMember[]>;
  findById(id: string): Promise<CareCircleMember | null>;
  /** The membership linking a user to an owner's circle, or null when none. */
  findMembership(ownerId: string, memberUserId: string): Promise<CareCircleMember | null>;
  save(member: CareCircleMember): Promise<void>;
  /** Owner scoped delete; a no op if the id does not belong to the owner. */
  delete(ownerId: string, id: string): Promise<void>;
}

export const CARE_CIRCLE_REPOSITORY = Symbol('CARE_CIRCLE_REPOSITORY');
