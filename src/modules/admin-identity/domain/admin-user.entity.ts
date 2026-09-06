import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { AdminRole } from './admin-role.enum';
import { AdminStatus } from './admin-status.enum';
import { EmailAddress } from './value-objects/email-address.vo';
import { PersonName } from './value-objects/person-name.vo';

interface AdminUserProps {
  name: PersonName;
  email: EmailAddress;
  passwordHash: string;
  role: AdminRole;
  status: AdminStatus;
  photoKey: string | null;
  mustChangePassword: boolean;
  passwordChangedAt: Date;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AdminUser aggregate root (an operations back office account).
 *
 * Admins are provisioned out of band, never self registered, so there is no
 * public factory that opens an unverified account: `provision` creates an active
 * account directly. As with the mobile User, the aggregate only ever holds a
 * password hash; hashing is an application concern performed through a port
 * before the hash reaches the domain. State changes are intention revealing
 * methods rather than open setters.
 */
export class AdminUser extends AggregateRoot<string> {
  private props: AdminUserProps;

  private constructor(id: string, props: AdminUserProps) {
    super(id);
    this.props = props;
  }

  /**
   * Provision a new, active back office account. When `mustChangePassword` is set
   * the account was issued a temporary password and the client forces a change on
   * first login.
   */
  public static provision(params: {
    id: string;
    name: PersonName;
    email: EmailAddress;
    passwordHash: string;
    role: AdminRole;
    mustChangePassword: boolean;
    now: Date;
  }): AdminUser {
    return new AdminUser(params.id, {
      name: params.name,
      email: params.email,
      passwordHash: params.passwordHash,
      role: params.role,
      status: AdminStatus.Active,
      photoKey: null,
      mustChangePassword: params.mustChangePassword,
      passwordChangedAt: params.now,
      lastLoginAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  /** Rehydrate an existing admin from persistence. */
  public static rehydrate(id: string, props: AdminUserProps): AdminUser {
    return new AdminUser(id, props);
  }

  /** Whether the account may authenticate and receive tokens. */
  public get canLogIn(): boolean {
    return this.props.status === AdminStatus.Active;
  }

  /**
   * Replace the stored password hash (voluntary change or forced first login
   * change). A successful change clears any pending must change requirement, since
   * the admin now owns their password.
   */
  public changePassword(newPasswordHash: string, now: Date): void {
    this.props.passwordHash = newPasswordHash;
    this.props.mustChangePassword = false;
    this.props.passwordChangedAt = now;
    this.props.updatedAt = now;
  }

  /** Stamp the last successful login for the security overview and audit. */
  public recordLogin(now: Date): void {
    this.props.lastLoginAt = now;
    this.props.updatedAt = now;
  }

  /** Block the account from authenticating without deleting its record. */
  public suspend(now: Date): void {
    this.props.status = AdminStatus.Suspended;
    this.props.updatedAt = now;
  }

  /** Restore a suspended account to active. */
  public reactivate(now: Date): void {
    this.props.status = AdminStatus.Active;
    this.props.updatedAt = now;
  }

  public get name(): PersonName {
    return this.props.name;
  }

  public get email(): EmailAddress {
    return this.props.email;
  }

  public get passwordHash(): string {
    return this.props.passwordHash;
  }

  public get role(): AdminRole {
    return this.props.role;
  }

  public get status(): AdminStatus {
    return this.props.status;
  }

  /** Opaque storage key for the avatar, or null when none is set. */
  public get photoKey(): string | null {
    return this.props.photoKey;
  }

  /** Whether the client must force a password change before normal use. */
  public get mustChangePassword(): boolean {
    return this.props.mustChangePassword;
  }

  public get passwordChangedAt(): Date {
    return this.props.passwordChangedAt;
  }

  public get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
