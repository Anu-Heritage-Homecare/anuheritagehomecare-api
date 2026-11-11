import { Invitation } from '../../domain/invitation.entity';
import { InvitationStatus } from '../../domain/invitation-status.enum';

export interface InvitationResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string | null;
  department: string | null;
  roleId: string;
  branchId: string | null;
  status: InvitationStatus;
  expiresAt: Date;
  invitedByAdminId: string | null;
  createdAt: Date;
}

/**
 * An invitation plus, only at creation or resend, the raw one time token. The
 * token is never persisted in clear and is returned exactly once so it can be
 * delivered to the invitee (email delivery is deferred).
 */
export interface InvitationWithTokenResult extends InvitationResult {
  token: string;
}

export function toInvitationResult(invitation: Invitation): InvitationResult {
  return {
    id: invitation.id,
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    fullName: `${invitation.firstName} ${invitation.lastName}`.trim(),
    phoneNumber: invitation.phoneNumber,
    department: invitation.department,
    roleId: invitation.roleId,
    branchId: invitation.branchId,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    invitedByAdminId: invitation.invitedByAdminId,
    createdAt: invitation.createdAt,
  };
}
