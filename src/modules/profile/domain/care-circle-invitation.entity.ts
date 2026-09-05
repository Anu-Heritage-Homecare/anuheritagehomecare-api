import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareAccessLevel } from './care-access-level.enum';

export enum InvitationStatus {
  Pending = 'PENDING',
  Accepted = 'ACCEPTED',
  Revoked = 'REVOKED',
}

interface CareCircleInvitationProps {
  ownerId: string;
  email: string;
  relationship: string;
  accessLevel: CareAccessLevel;
  token: string;
  status: InvitationStatus;
  invitedAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
}

/**
 * An invitation to join a family owner's care circle, addressed to an email at a
 * chosen access level. It is PENDING until the invited person accepts (proving
 * the email), which links their account as a member, or the owner revokes it.
 */
export class CareCircleInvitation extends Entity<string> {
  private props: CareCircleInvitationProps;

  private constructor(id: string, props: CareCircleInvitationProps) {
    super(id);
    this.props = props;
  }

  public static invite(params: {
    id: string;
    ownerId: string;
    email: string;
    relationship: string;
    accessLevel: CareAccessLevel;
    token: string;
    now: Date;
  }): CareCircleInvitation {
    const email = params.email.trim().toLowerCase();
    const relationship = params.relationship.trim();
    if (email.length === 0) {
      throw new ValidationException('An invitation needs an email');
    }
    if (relationship.length === 0) {
      throw new ValidationException('An invitation needs a relationship');
    }
    return new CareCircleInvitation(params.id, {
      ownerId: params.ownerId,
      email,
      relationship,
      accessLevel: params.accessLevel,
      token: params.token,
      status: InvitationStatus.Pending,
      invitedAt: params.now,
      acceptedAt: null,
      acceptedByUserId: null,
    });
  }

  public static rehydrate(id: string, props: CareCircleInvitationProps): CareCircleInvitation {
    return new CareCircleInvitation(id, props);
  }

  /** Accept the invitation, binding it to the accepting user. */
  public accept(userId: string, now: Date): void {
    if (this.props.status !== InvitationStatus.Pending) {
      throw new ValidationException('This invitation is no longer open');
    }
    this.props.status = InvitationStatus.Accepted;
    this.props.acceptedByUserId = userId;
    this.props.acceptedAt = now;
  }

  public revoke(): void {
    if (this.props.status === InvitationStatus.Accepted) {
      throw new ValidationException('An accepted invitation cannot be revoked');
    }
    this.props.status = InvitationStatus.Revoked;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get email(): string {
    return this.props.email;
  }

  public get relationship(): string {
    return this.props.relationship;
  }

  public get accessLevel(): CareAccessLevel {
    return this.props.accessLevel;
  }

  public get token(): string {
    return this.props.token;
  }

  public get status(): InvitationStatus {
    return this.props.status;
  }

  public get invitedAt(): Date {
    return this.props.invitedAt;
  }

  public get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  public get acceptedByUserId(): string | null {
    return this.props.acceptedByUserId;
  }
}
