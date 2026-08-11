import { User } from '../../domain/user.entity';
import { UserStatus } from '../../domain/user-status.enum';
import { UserType } from '../../domain/user-type.enum';

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
  emailVerified: boolean;
  phoneVerified: boolean;
  isFamilyOwner: boolean;
  status: UserStatus;
}

export function toUserProfile(user: User): UserProfileResult {
  return {
    id: user.id,
    userType: user.userType,
    firstName: user.name.firstName,
    lastName: user.name.lastName,
    email: user.email.value,
    phone: user.phone.value,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    isFamilyOwner: user.isFamilyOwner,
    status: user.status,
  };
}
