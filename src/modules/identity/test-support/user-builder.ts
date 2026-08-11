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
  verified?: boolean;
}

/** Build a User aggregate for specs, optionally already email verified. */
export function buildUser(options: BuildUserOptions = {}): User {
  const user = User.register({
    id: options.id ?? 'user-1',
    userType: UserType.FamilyMember,
    name: PersonName.create('Ada', 'Obi'),
    email: EmailAddress.create(options.email ?? 'ada.obi@example.com'),
    phone: PhoneNumber.create(options.phone ?? '+2348031234567'),
    address: PostalAddress.create({
      line1: '12 Marina Road',
      city: 'Lagos',
      state: 'Lagos',
      postalCode: '101233',
      country: 'NG',
    }),
    passwordHash: options.passwordHash ?? 'hashed:S3curePass',
    isFamilyOwner: true,
    now: FIXED_NOW,
  });
  if (options.verified) {
    user.markEmailVerified(FIXED_NOW);
  }
  user.clearDomainEvents();
  return user;
}
