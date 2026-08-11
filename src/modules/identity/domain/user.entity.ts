import { AggregateRoot } from '@shared/domain/aggregate-root.base';
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
  emailVerified: boolean;
  phoneVerified: boolean;
  isFamilyOwner: boolean;
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
      emailVerified: false,
      phoneVerified: false,
      isFamilyOwner: params.isFamilyOwner,
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
    return this.props.emailVerified && this.props.status !== UserStatus.Suspended;
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

  /** Replace the stored password hash (used by the reset flow). */
  public changePassword(newPasswordHash: string, now: Date): void {
    this.props.passwordHash = newPasswordHash;
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

  public get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  public get phoneVerified(): boolean {
    return this.props.phoneVerified;
  }

  public get isFamilyOwner(): boolean {
    return this.props.isFamilyOwner;
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
