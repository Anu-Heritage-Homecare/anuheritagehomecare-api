import { Injectable } from '@nestjs/common';
import { UserType as PrismaUserType } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { UserType } from '../../domain/user-type.enum';
import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';
import { UserMapper } from './user.mapper';

const TO_PRISMA_USER_TYPE: Record<UserType, PrismaUserType> = {
  [UserType.Caregiver]: 'CAREGIVER',
  [UserType.FamilyMember]: 'FAMILY_MEMBER',
};

/**
 * Prisma backed adapter for the UserRepository port. The only class in the
 * module that talks to the database for users. `save` upserts so it handles both
 * new and existing aggregates idempotently.
 */
@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const row = UserMapper.toPersistence(user);
    await this.prisma.user.upsert({
      where: { id: row.id },
      create: row,
      update: {
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        city: row.city,
        state: row.state,
        postalCode: row.postalCode,
        country: row.country,
        passwordHash: row.passwordHash,
        emailVerified: row.emailVerified,
        phoneVerified: row.phoneVerified,
        isFamilyOwner: row.isFamilyOwner,
        mustChangePassword: row.mustChangePassword,
        twoFactorEnabled: row.twoFactorEnabled,
        twoFactorSecret: row.twoFactorSecret,
        status: row.status,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.trim().toLowerCase() },
    });
    return count > 0;
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { phone } });
    return count > 0;
  }

  async countByType(userType: UserType): Promise<number> {
    return this.prisma.user.count({ where: { userType: TO_PRISMA_USER_TYPE[userType] } });
  }
}
