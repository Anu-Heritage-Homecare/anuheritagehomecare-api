import { CareCircleInvitation } from './care-circle-invitation.entity';

/** Persistence port for care circle invitations. */
export interface CareCircleInvitationRepository {
  save(invitation: CareCircleInvitation): Promise<void>;
  findById(id: string): Promise<CareCircleInvitation | null>;
  findByToken(token: string): Promise<CareCircleInvitation | null>;
  /** Pending invitations for an owner, newest first. */
  listPendingForOwner(ownerId: string): Promise<CareCircleInvitation[]>;
}

export const CARE_CIRCLE_INVITATION_REPOSITORY = Symbol('CARE_CIRCLE_INVITATION_REPOSITORY');
