import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { UserEmailVerifiedEvent } from './events/user-email-verified.event';
import { UserRegisteredEvent } from './events/user-registered.event';
import { UserStatus } from './user-status.enum';
import { UserType } from './user-type.enum';
import { EmailAddress } from './value-objects/email-address.vo';
import { PersonName } from './value-objects/person-name.vo';
import { PhoneNumber } from './value-objects/phone-number.vo';
import { PostalAddress } from './value-objects/postal-address.vo';

interface UserProps {
  userType: UserType;
  name: PersonName;
  email: EmailAddress;
  phone: PhoneNumber;
  address: PostalAddress;
  passwordHash: string;
  photoKey: string | null;
  dateOfBirth: Date | null;
  relationshipToRecipient: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  isFamilyOwner: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User aggregate root (a mobile app account: caregiver or family member).
 *
 * All construction goes through factory methods so invariants hold in one place,
 * and state changes are intention revealing methods rather than open setters.
 * The aggregate only ever holds a password hash; hashing is an application
 * concern performed through a port before the hash reaches the domain.
 */
export class User extends AggregateRoot<string> {
  private props: UserProps;

  private constructor(id: string, props: UserProps) {
    super(id);
    this.props = props;
  }

  /** Register a brand new, unverified account and record the domain event. */
  public static register(params: {
    id: string;
    userType: UserType;
    name: PersonName;
    email: EmailAddress;
    phone: PhoneNumber;
    address: PostalAddress;
    passwordHash: string;
    isFamilyOwner: boolean;
    now: Date;
  }): User {
    const user = new User(params.id, {
      userType: params.userType,
      name: params.name,
      email: params.email,
      phone: params.phone,
      address: params.address,
      passwordHash: params.passwordHash,
      photoKey: null,
      dateOfBirth: null,
      relationshipToRecipient: null,
      emailVerified: false,
      phoneVerified: false,
      isFamilyOwner: params.isFamilyOwner,
      mustChangePassword: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      status: UserStatus.PendingVerification,
      createdAt: params.now,
      updatedAt: params.now,
    });
    user.addDomainEvent(new UserRegisteredEvent(params.id, params.email.value));
    return user;
  }

  /** Rehydrate an existing user from persistence without emitting events. */
  public static rehydrate(id: string, props: UserProps): User {
    return new User(id, props);
  }

  /** Whether the account may authenticate and receive tokens. */
  public get canLogIn(): boolean {
    return (
      this.props.emailVerified &&
      this.props.status !== UserStatus.Suspended &&
      this.props.status !== UserStatus.Closed
    );
  }

  /**
   * Mark the email as verified. A pending account is promoted to active. Calling
   * this on an already verified account is a harmless no-op.
   */
  public markEmailVerified(now: Date): void {
    if (this.props.emailVerified) {
      return;
    }
    this.props.emailVerified = true;
    if (this.props.status === UserStatus.PendingVerification) {
      this.props.status = UserStatus.Active;
    }
    this.props.updatedAt = now;
    this.addDomainEvent(new UserEmailVerifiedEvent(this.id, this.props.email.value));
  }

  /**
   * Replace the stored password hash. Used by the reset flow and the
   * authenticated change flow. Any successful change clears a pending
   * must change password requirement, since the user now owns their password.
   */
  public changePassword(newPasswordHash: string, now: Date): void {
    this.props.passwordHash = newPasswordHash;
    this.props.mustChangePassword = false;
    this.props.updatedAt = now;
  }

  /**
   * Update the editable personal information: name, phone, postal address and the
   * optional date of birth and relationship to the care recipient.
   */
  public updateProfile(params: {
    name: PersonName;
    phone: PhoneNumber;
    address: PostalAddress;
    dateOfBirth: Date | null;
    relationshipToRecipient: string | null;
    now: Date;
  }): void {
    this.props.name = params.name;
    this.props.phone = params.phone;
    this.props.address = params.address;
    this.props.dateOfBirth = params.dateOfBirth;
    this.props.relationshipToRecipient =
      params.relationshipToRecipient !== null && params.relationshipToRecipient.trim().length > 0
        ? params.relationshipToRecipient.trim()
        : null;
    this.props.updatedAt = params.now;
  }

  /** Set (or clear) the profile photo, stored as an opaque object store key. */
  public setPhotoKey(photoKey: string | null, now: Date): void {
    this.props.photoKey = photoKey;
    this.props.updatedAt = now;
  }

  /**
   * Soft close the account: block login and mark it closed. Sessions are revoked
   * by the application. The record and history are retained.
   */
  public closeAccount(now: Date): void {
    this.props.status = UserStatus.Closed;
    this.props.updatedAt = now;
  }

  /**
   * Begin two factor setup by storing an (already encrypted) TOTP secret. The
   * factor is not active yet: the user must prove they can generate a valid code
   * before it is enabled. Cannot restart while two factor is already enabled.
   */
  public beginTwoFactorSetup(encryptedSecret: string, now: Date): void {
    if (this.props.twoFactorEnabled) {
      throw new ValidationException('Two factor authentication is already enabled');
    }
    this.props.twoFactorSecret = encryptedSecret;
    this.props.updatedAt = now;
  }

  /**
   * Activate two factor authentication once the pending secret has been proven.
   * A setup must be in progress (a secret stored) for this to be valid.
   */
  public enableTwoFactor(now: Date): void {
    if (this.props.twoFactorSecret === null) {
      throw new ValidationException('Start two factor setup before enabling it');
    }
    this.props.twoFactorEnabled = true;
    this.props.updatedAt = now;
  }

  /** Turn two factor authentication off and forget the stored secret. */
  public disableTwoFactor(now: Date): void {
    this.props.twoFactorEnabled = false;
    this.props.twoFactorSecret = null;
    this.props.updatedAt = now;
  }

  public get userType(): UserType {
    return this.props.userType;
  }

  public get name(): PersonName {
    return this.props.name;
  }

  public get email(): EmailAddress {
    return this.props.email;
  }

  public get phone(): PhoneNumber {
    return this.props.phone;
  }

  public get address(): PostalAddress {
    return this.props.address;
  }

  public get passwordHash(): string {
    return this.props.passwordHash;
  }

  /** Opaque storage key for the profile photo, or null when none is set. */
  public get photoKey(): string | null {
    return this.props.photoKey;
  }

  public get dateOfBirth(): Date | null {
    return this.props.dateOfBirth;
  }

  public get relationshipToRecipient(): string | null {
    return this.props.relationshipToRecipient;
  }

  public get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  public get phoneVerified(): boolean {
    return this.props.phoneVerified;
  }

  public get isFamilyOwner(): boolean {
    return this.props.isFamilyOwner;
  }

  /** Whether the client must force a password change before normal use. */
  public get mustChangePassword(): boolean {
    return this.props.mustChangePassword;
  }

  /** Whether login requires a second factor after the password. */
  public get twoFactorEnabled(): boolean {
    return this.props.twoFactorEnabled;
  }

  /** The encrypted TOTP secret, or null when no setup is in progress. */
  public get twoFactorSecret(): string | null {
    return this.props.twoFactorSecret;
  }

  public get status(): UserStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
