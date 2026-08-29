import {
  Country as PrismaCountry,
  User as PrismaUser,
  UserStatus as PrismaUserStatus,
  UserType as PrismaUserType,
} from '@prisma/client';
import { Country } from '../../domain/country.enum';
import { User } from '../../domain/user.entity';
import { UserStatus } from '../../domain/user-status.enum';
import { UserType } from '../../domain/user-type.enum';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { PostalAddress } from '../../domain/value-objects/postal-address.vo';

/**
 * Translates between the Prisma User row and the User aggregate. The only place
 * that knows both shapes, so the domain stays free of Prisma types.
 */
export class UserMapper {
  static toDomain(row: PrismaUser): User {
    return User.rehydrate(row.id, {
      userType: UserMapper.TO_DOMAIN_TYPE[row.userType],
      name: PersonName.create(row.firstName, row.lastName),
      email: EmailAddress.create(row.email),
      phone: PhoneNumber.create(row.phone),
      address: PostalAddress.create({
        line1: row.addressLine1,
        line2: row.addressLine2,
        city: row.city,
        state: row.state,
        postalCode: row.postalCode,
        country: row.country,
      }),
      passwordHash: row.passwordHash,
      photoKey: row.photoKey,
      emailVerified: row.emailVerified,
      phoneVerified: row.phoneVerified,
      isFamilyOwner: row.isFamilyOwner,
      mustChangePassword: row.mustChangePassword,
      twoFactorEnabled: row.twoFactorEnabled,
      twoFactorSecret: row.twoFactorSecret,
      status: UserMapper.TO_DOMAIN_STATUS[row.status],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(user: User): PrismaUser {
    return {
      id: user.id,
      userType: UserMapper.TO_PERSISTENCE_TYPE[user.userType],
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      email: user.email.value,
      phone: user.phone.value,
      addressLine1: user.address.line1,
      addressLine2: user.address.line2,
      city: user.address.city,
      state: user.address.state,
      postalCode: user.address.postalCode,
      country: UserMapper.TO_PERSISTENCE_COUNTRY[user.address.country],
      passwordHash: user.passwordHash,
      photoKey: user.photoKey,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      isFamilyOwner: user.isFamilyOwner,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      status: UserMapper.TO_PERSISTENCE_STATUS[user.status],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private static readonly TO_DOMAIN_TYPE: Record<PrismaUserType, UserType> = {
    CAREGIVER: UserType.Caregiver,
    FAMILY_MEMBER: UserType.FamilyMember,
  };

  private static readonly TO_PERSISTENCE_TYPE: Record<UserType, PrismaUserType> = {
    [UserType.Caregiver]: 'CAREGIVER',
    [UserType.FamilyMember]: 'FAMILY_MEMBER',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaUserStatus, UserStatus> = {
    PENDING_VERIFICATION: UserStatus.PendingVerification,
    ACTIVE: UserStatus.Active,
    SUSPENDED: UserStatus.Suspended,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<UserStatus, PrismaUserStatus> = {
    [UserStatus.PendingVerification]: 'PENDING_VERIFICATION',
    [UserStatus.Active]: 'ACTIVE',
    [UserStatus.Suspended]: 'SUSPENDED',
  };

  private static readonly TO_PERSISTENCE_COUNTRY: Record<Country, PrismaCountry> = {
    [Country.UnitedStates]: 'US',
    [Country.Nigeria]: 'NG',
  };
}
