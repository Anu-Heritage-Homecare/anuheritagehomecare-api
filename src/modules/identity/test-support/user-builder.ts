import { User } from '../domain/user.entity';
import { UserType } from '../domain/user-type.enum';
import { EmailAddress } from '../domain/value-objects/email-address.vo';
import { PersonName } from '../domain/value-objects/person-name.vo';
import { PhoneNumber } from '../domain/value-objects/phone-number.vo';
import { PostalAddress } from '../domain/value-objects/postal-address.vo';
import { FIXED_NOW } from './doubles';

interface BuildUserOptions {
  id?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  userType?: UserType;
  verified?: boolean;
  /** Simulate an account provisioned with a temporary password. */
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
}

/** Build a User aggregate for specs, optionally already email verified. */
export function buildUser(options: BuildUserOptions = {}): User {
  const id = options.id ?? 'user-1';
  const userType = options.userType ?? UserType.FamilyMember;
  const name = PersonName.create('Ada', 'Obi');
  const email = EmailAddress.create(options.email ?? 'ada.obi@example.com');
  const phone = PhoneNumber.create(options.phone ?? '+2348031234567');
  const address = PostalAddress.create({
    line1: '12 Marina Road',
    city: 'Lagos',
    state: 'Lagos',
    postalCode: '101233',
    country: 'NG',
  });

  const user = User.register({
    id,
    userType,
    name,
    email,
    phone,
    address,
    passwordHash: options.passwordHash ?? 'hashed:S3curePass',
    isFamilyOwner: userType === UserType.FamilyMember,
    now: FIXED_NOW,
  });
  if (options.verified) {
    user.markEmailVerified(FIXED_NOW);
  }
  user.clearDomainEvents();

  const mustChangePassword = options.mustChangePassword ?? false;
  const twoFactorEnabled = options.twoFactorEnabled ?? false;
  const twoFactorSecret = options.twoFactorSecret ?? null;

  if (!mustChangePassword && !twoFactorEnabled && twoFactorSecret === null) {
    return user;
  }

  // Rehydrate persisted state (a temporary password, or two factor enabled)
  // exactly as it would load from the database.
  return User.rehydrate(id, {
    userType,
    name,
    email,
    phone,
    address,
    passwordHash: user.passwordHash,
    photoKey: user.photoKey,
    dateOfBirth: null,
    relationshipToRecipient: null,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    isFamilyOwner: user.isFamilyOwner,
    mustChangePassword,
    twoFactorEnabled,
    twoFactorSecret,
    passwordChangedAt: user.passwordChangedAt,
    biometricEnabled: user.biometricEnabled,
    sessionTimeoutMinutes: user.sessionTimeoutMinutes,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}
