import { Invitation } from './invitation.entity';
import { InvitationStatus } from './invitation-status.enum';

/** Persistence port for back office invitations. */
export interface InvitationRepository {
  /** Invitations, most recent first, optionally filtered by status. */
  list(status: InvitationStatus | null): Promise<Invitation[]>;
  findById(id: string): Promise<Invitation | null>;
  /** Find a pending invitation by the hash of its one time token. */
  findPendingByTokenHash(tokenHash: string): Promise<Invitation | null>;
  /** Whether a pending invitation already exists for this email. */
  existsPendingForEmail(email: string): Promise<boolean>;
  save(invitation: Invitation): Promise<void>;
}

export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');
