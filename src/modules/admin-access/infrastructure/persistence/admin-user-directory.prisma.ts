import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ValidationException } from '@shared/domain/domain-exception';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AdminUserAssignment,
  AdminUserDirectory,
  AdminUserListFilters,
  AdminUserRow,
  ProvisionFromInvitation,
} from '../../application/ports/admin-user-directory.port';

type UserRow = Prisma.AdminUserGetPayload<{
  include: { accessRole: { select: { name: true } }; branch: { select: { name: true } } };
}>;

/** Prisma backed management view over the AdminUser table (the Users tab). */
@Injectable()
export class AdminUserDirectoryPrisma implements AdminUserDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: AdminUserListFilters): Promise<{ rows: AdminUserRow[]; total: number }> {
    const where: Prisma.AdminUserWhereInput = {};
    if (filters.roleId) {
      where.roleId = filters.roleId;
    }
    if (filters.branchId) {
      where.branchId = filters.branchId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      // shortcut: matches first name, last name or email separately, not the
      // concatenated full name. Upgrade to a search column if that is needed.
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.adminUser.findMany({
        where,
        include: { accessRole: { select: { name: true } }, branch: { select: { name: true } } },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.adminUser.count({ where }),
    ]);
    return { rows: rows.map((row) => AdminUserDirectoryPrisma.toRow(row)), total };
  }

  async findById(id: string): Promise<AdminUserRow | null> {
    const row = await this.prisma.adminUser.findUnique({
      where: { id },
      include: { accessRole: { select: { name: true } }, branch: { select: { name: true } } },
    });
    return row ? AdminUserDirectoryPrisma.toRow(row) : null;
  }

  async updateAssignment(id: string, assignment: AdminUserAssignment): Promise<void> {
    const data: Prisma.AdminUserUpdateInput = {};
    if (assignment.roleId !== undefined) {
      data.accessRole = { connect: { id: assignment.roleId } };
    }
    if (assignment.branchId !== undefined) {
      data.branch =
        assignment.branchId === null
          ? { disconnect: true }
          : { connect: { id: assignment.branchId } };
    }
    if (assignment.status !== undefined) {
      data.status = assignment.status;
    }
    if (assignment.authRole !== undefined) {
      data.role = assignment.authRole;
    }
    await this.prisma.adminUser.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.adminUser.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ValidationException(
          'This user has recorded activity and cannot be removed; suspend the account instead',
        );
      }
      throw error;
    }
  }

  async countsByRole(): Promise<Map<string, number>> {
    const groups = await this.prisma.adminUser.groupBy({
      by: ['roleId'],
      where: { roleId: { not: null } },
      _count: { _all: true },
    });
    const counts = new Map<string, number>();
    for (const group of groups) {
      if (group.roleId !== null) {
        counts.set(group.roleId, group._count._all);
      }
    }
    return counts;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.adminUser.count({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    return count > 0;
  }

  async branchExists(branchId: string): Promise<boolean> {
    const count = await this.prisma.organizationBranch.count({ where: { id: branchId } });
    return count > 0;
  }

  async provisionFromInvitation(params: ProvisionFromInvitation): Promise<void> {
    await this.prisma.adminUser.create({
      data: {
        id: params.id,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phoneNumber: params.phoneNumber,
        department: params.department,
        passwordHash: params.passwordHash,
        role: params.authRole,
        status: 'ACTIVE',
        mustChangePassword: params.mustChangePassword,
        roleId: params.roleId,
        branchId: params.branchId,
      },
    });
  }

  private static toRow(row: UserRow): AdminUserRow {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      roleId: row.roleId,
      roleName: row.accessRole?.name ?? null,
      branchId: row.branchId,
      branchName: row.branch?.name ?? null,
      status: row.status,
      lastActiveAt: row.lastLoginAt,
      photoKey: row.photoKey,
    };
  }
}
