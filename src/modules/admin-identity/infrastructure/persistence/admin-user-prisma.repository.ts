import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AdminUser } from '../../domain/admin-user.entity';
import { AdminUserRepository } from '../../domain/admin-user.repository';
import { AdminUserMapper } from './admin-user.mapper';

/**
 * Prisma backed adapter for the AdminUserRepository port. The only class in the
 * module that talks to the database for admins. `save` upserts so it handles both
 * new and existing aggregates idempotently.
 */
@Injectable()
export class AdminUserPrismaRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(admin: AdminUser): Promise<void> {
    const row = AdminUserMapper.toPersistence(admin);
    await this.prisma.adminUser.upsert({
      where: { id: row.id },
      create: row,
      update: {
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        passwordHash: row.passwordHash,
        role: row.role,
        status: row.status,
        photoKey: row.photoKey,
        mustChangePassword: row.mustChangePassword,
        passwordChangedAt: row.passwordChangedAt,
        lastLoginAt: row.lastLoginAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<AdminUser | null> {
    const row = await this.prisma.adminUser.findUnique({ where: { id } });
    return row ? AdminUserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    const row = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? AdminUserMapper.toDomain(row) : null;
  }
}
