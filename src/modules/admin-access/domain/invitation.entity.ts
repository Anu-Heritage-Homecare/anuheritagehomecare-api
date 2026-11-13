import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { InvitationStatus } from './invitation-status.enum';

interface InvitationProps {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  department: string | null;
  roleId: string;
  branchId: string | null;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  invitedByAdminId: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_NAME = 100;
const MAX_EMAIL = 255;

/**
 * A pending invitation to join the back office. Only a hash of the one time token
 * is held; the raw token is delivered out of band. Accepting it (with the raw
 * token and a chosen password) provisions an AdminUser and closes the invitation.
 */
export class Invitation extends AggregateRoot<string> {
  private props: InvitationProps;

  private constructor(id: string, props: InvitationProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    department?: string | null;
    roleId: string;
    branchId?: string | null;
    tokenHash: string;
    expiresAt: Date;
    invitedByAdminId: string | null;
    now: Date;
  }): Invitation {
    return new Invitation(params.id, {
      email: Invitation.cleanEmail(params.email),
      firstName: Invitation.cleanName(params.firstName, 'First name'),
      lastName: Invitation.cleanName(params.lastName, 'Last name'),
      phoneNumber: Invitation.cleanOptional(params.phoneNumber, 32),
      department: Invitation.cleanOptional(params.department, 100),
      roleId: params.roleId,
      branchId: params.branchId ?? null,
      tokenHash: params.tokenHash,
      status: InvitationStatus.Pending,
      expiresAt: params.expiresAt,
      invitedByAdminId: params.invitedByAdminId,
      acceptedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: InvitationProps): Invitation {
    return new Invitation(id, props);
  }

  /** Whether this invitation can still be accepted at the given time. */
  public isAcceptable(now: Date): boolean {
    return (
      this.props.status === InvitationStatus.Pending &&
      this.props.expiresAt.getTime() > now.getTime()
    );
  }

  /** Accept the invitation, closing it. Throws if it is not acceptable. */
  public accept(now: Date): void {
    if (this.props.status !== InvitationStatus.Pending) {
      throw new ValidationException('This invitation is no longer pending');
    }
    if (this.props.expiresAt.getTime() <= now.getTime()) {
      this.props.status = InvitationStatus.Expired;
      this.props.updatedAt = now;
      throw new ValidationException('This invitation has expired');
    }
    this.props.status = InvitationStatus.Accepted;
    this.props.acceptedAt = now;
    this.props.updatedAt = now;
  }

  /** Revoke a pending invitation. */
  public revoke(now: Date): void {
    if (this.props.status !== InvitationStatus.Pending) {
      throw new ValidationException('Only a pending invitation can be revoked');
    }
    this.props.status = InvitationStatus.Revoked;
    this.props.updatedAt = now;
  }

  /** Reissue the token and extend the expiry (the Resend action). */
  public reissue(tokenHash: string, expiresAt: Date, now: Date): void {
    if (this.props.status !== InvitationStatus.Pending) {
      throw new ValidationException('Only a pending invitation can be resent');
    }
    this.props.tokenHash = tokenHash;
    this.props.expiresAt = expiresAt;
    this.props.updatedAt = now;
  }

  private static cleanEmail(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length === 0 || trimmed.length > MAX_EMAIL || !trimmed.includes('@')) {
      throw new ValidationException('A valid email is required');
    }
    return trimmed;
  }

  private static cleanName(value: string, label: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException(`${label} is required`);
    }
    if (trimmed.length > MAX_NAME) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return trimmed;
  }

  private static cleanOptional(value: string | null | undefined, max: number): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length > max) {
      throw new ValidationException('A value exceeds the maximum length');
    }
    return trimmed;
  }

  public get email(): string {
    return this.props.email;
  }

  public get firstName(): string {
    return this.props.firstName;
  }

  public get lastName(): string {
    return this.props.lastName;
  }

  public get phoneNumber(): string | null {
    return this.props.phoneNumber;
  }

  public get department(): string | null {
    return this.props.department;
  }

  public get roleId(): string {
    return this.props.roleId;
  }

  public get branchId(): string | null {
    return this.props.branchId;
  }

  public get tokenHash(): string {
    return this.props.tokenHash;
  }

  public get status(): InvitationStatus {
    return this.props.status;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get invitedByAdminId(): string | null {
    return this.props.invitedByAdminId;
  }

  public get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
