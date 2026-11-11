import { Injectable } from '@nestjs/common';
import { AdminAccessRole as PrismaRole, AdminRole as PrismaAdminRole } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AccessRole } from '../../domain/access-role.entity';
import { AccessRoleRepository } from '../../domain/access-role.repository';

/** Prisma backed adapter for the AccessRoleRepository port. */
@Injectable()
export class AccessRolePrismaRepository implements AccessRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AccessRole[]> {
    const rows = await this.prisma.adminAccessRole.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => AccessRolePrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<AccessRole | null> {
    const row = await this.prisma.adminAccessRole.findUnique({ where: { id } });
    return row ? AccessRolePrismaRepository.toDomain(row) : null;
  }

  async findByName(name: string): Promise<AccessRole | null> {
    const row = await this.prisma.adminAccessRole.findUnique({ where: { name } });
    return row ? AccessRolePrismaRepository.toDomain(row) : null;
  }

  async save(role: AccessRole): Promise<void> {
    const data = {
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      systemKey: (role.systemKey as PrismaAdminRole | null) ?? null,
      permissions: [...role.permissions],
      updatedAt: role.updatedAt,
    };
    await this.prisma.adminAccessRole.upsert({
      where: { id: role.id },
      create: { id: role.id, createdAt: role.createdAt, ...data },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.adminAccessRole.delete({ where: { id } });
  }

  private static toDomain(row: PrismaRole): AccessRole {
    return AccessRole.rehydrate(row.id, {
      name: row.name,
      description: row.description,
      isSystem: row.isSystem,
      systemKey: row.systemKey,
      permissions: row.permissions,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
