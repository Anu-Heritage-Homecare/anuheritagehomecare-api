import {
  AdminRole as PrismaAdminRole,
  AdminStatus as PrismaAdminStatus,
  AdminUser as PrismaAdminUser,
} from '@prisma/client';
import { AdminRole } from '../../domain/admin-role.enum';
import { AdminStatus } from '../../domain/admin-status.enum';
import { AdminUser } from '../../domain/admin-user.entity';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { PersonName } from '../../domain/value-objects/person-name.vo';

/**
 * Translates between the Prisma AdminUser row and the AdminUser aggregate. The
 * only place that knows both shapes, so the domain stays free of Prisma types.
 */
export class AdminUserMapper {
  static toDomain(row: PrismaAdminUser): AdminUser {
    return AdminUser.rehydrate(row.id, {
      name: PersonName.create(row.firstName, row.lastName),
      email: EmailAddress.create(row.email),
      passwordHash: row.passwordHash,
      role: AdminUserMapper.TO_DOMAIN_ROLE[row.role],
      status: AdminUserMapper.TO_DOMAIN_STATUS[row.status],
      photoKey: row.photoKey,
      mustChangePassword: row.mustChangePassword,
      passwordChangedAt: row.passwordChangedAt,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(admin: AdminUser): PrismaAdminUser {
    return {
      id: admin.id,
      firstName: admin.name.firstName,
      lastName: admin.name.lastName,
      email: admin.email.value,
      passwordHash: admin.passwordHash,
      role: AdminUserMapper.TO_PERSISTENCE_ROLE[admin.role],
      status: AdminUserMapper.TO_PERSISTENCE_STATUS[admin.status],
      photoKey: admin.photoKey,
      mustChangePassword: admin.mustChangePassword,
      passwordChangedAt: admin.passwordChangedAt,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  private static readonly TO_DOMAIN_ROLE: Record<PrismaAdminRole, AdminRole> = {
    SUPER_ADMIN: AdminRole.SuperAdmin,
    OPERATIONS_MANAGER: AdminRole.OperationsManager,
    COORDINATOR: AdminRole.Coordinator,
  };

  private static readonly TO_PERSISTENCE_ROLE: Record<AdminRole, PrismaAdminRole> = {
    [AdminRole.SuperAdmin]: 'SUPER_ADMIN',
    [AdminRole.OperationsManager]: 'OPERATIONS_MANAGER',
    [AdminRole.Coordinator]: 'COORDINATOR',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaAdminStatus, AdminStatus> = {
    ACTIVE: AdminStatus.Active,
    SUSPENDED: AdminStatus.Suspended,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<AdminStatus, PrismaAdminStatus> = {
    [AdminStatus.Active]: 'ACTIVE',
    [AdminStatus.Suspended]: 'SUSPENDED',
  };
}
