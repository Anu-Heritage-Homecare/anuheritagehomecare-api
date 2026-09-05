import { User } from '../../domain/user.entity';
import { Country } from '../../domain/country.enum';
import { UserStatus } from '../../domain/user-status.enum';
import { UserType } from '../../domain/user-type.enum';

/** The postal address of a user, as a flat projection. */
export interface UserAddressResult {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: Country;
}

/**
 * Flat, serialisable projection of a user for the presentation layer. Never
 * includes the password hash or any secret.
 */
export interface UserProfileResult {
  id: string;
  userType: UserType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: UserAddressResult;
  emailVerified: boolean;
  phoneVerified: boolean;
  isFamilyOwner: boolean;
  mustChangePassword: boolean;
  status: UserStatus;
  /** Opaque object store key for the avatar; null when none is set. */
  photoKey: string | null;
  /** Signed delivery URL for the avatar, resolved by the reads that have storage. */
  photoUrl: string | null;
}

export function toUserProfile(user: User): UserProfileResult {
  return {
    id: user.id,
    userType: user.userType,
    firstName: user.name.firstName,
    lastName: user.name.lastName,
    email: user.email.value,
    phone: user.phone.value,
    address: {
      line1: user.address.line1,
      line2: user.address.line2,
      city: user.address.city,
      state: user.address.state,
      postalCode: user.address.postalCode,
      country: user.address.country,
    },
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    isFamilyOwner: user.isFamilyOwner,
    mustChangePassword: user.mustChangePassword,
    status: user.status,
    photoKey: user.photoKey,
    photoUrl: null,
  };
}
