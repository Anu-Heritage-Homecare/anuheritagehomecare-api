import { Injectable } from '@nestjs/common';
import {
  AdminInvitation as PrismaInvitation,
  AdminInvitationStatus as PrismaStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Invitation } from '../../domain/invitation.entity';
import { InvitationStatus } from '../../domain/invitation-status.enum';
import { InvitationRepository } from '../../domain/invitation.repository';

const TO_DOMAIN_STATUS: Record<PrismaStatus, InvitationStatus> = {
  PENDING: InvitationStatus.Pending,
  ACCEPTED: InvitationStatus.Accepted,
  REVOKED: InvitationStatus.Revoked,
  EXPIRED: InvitationStatus.Expired,
};
const TO_PRISMA_STATUS: Record<InvitationStatus, PrismaStatus> = {
  [InvitationStatus.Pending]: 'PENDING',
  [InvitationStatus.Accepted]: 'ACCEPTED',
  [InvitationStatus.Revoked]: 'REVOKED',
  [InvitationStatus.Expired]: 'EXPIRED',
};

/** Prisma backed adapter for the InvitationRepository port. */
@Injectable()
export class InvitationPrismaRepository implements InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(status: InvitationStatus | null): Promise<Invitation[]> {
    const rows = await this.prisma.adminInvitation.findMany({
      where: status === null ? {} : { status: TO_PRISMA_STATUS[status] },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => InvitationPrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<Invitation | null> {
    const row = await this.prisma.adminInvitation.findUnique({ where: { id } });
    return row ? InvitationPrismaRepository.toDomain(row) : null;
  }

  async findPendingByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const row = await this.prisma.adminInvitation.findFirst({
      where: { tokenHash, status: 'PENDING' },
    });
    return row ? InvitationPrismaRepository.toDomain(row) : null;
  }

  async existsPendingForEmail(email: string): Promise<boolean> {
    const count = await this.prisma.adminInvitation.count({
      where: { email: email.trim().toLowerCase(), status: 'PENDING' },
    });
    return count > 0;
  }

  async save(invitation: Invitation): Promise<void> {
    const data = {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      phoneNumber: invitation.phoneNumber,
      department: invitation.department,
      roleId: invitation.roleId,
      branchId: invitation.branchId,
      tokenHash: invitation.tokenHash,
      status: TO_PRISMA_STATUS[invitation.status],
      expiresAt: invitation.expiresAt,
      invitedByAdminId: invitation.invitedByAdminId,
      acceptedAt: invitation.acceptedAt,
      updatedAt: invitation.updatedAt,
    };
    await this.prisma.adminInvitation.upsert({
      where: { id: invitation.id },
      create: { id: invitation.id, createdAt: invitation.createdAt, ...data },
      update: data,
    });
  }

  private static toDomain(row: PrismaInvitation): Invitation {
    return Invitation.rehydrate(row.id, {
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phoneNumber: row.phoneNumber,
      department: row.department,
      roleId: row.roleId,
      branchId: row.branchId,
      tokenHash: row.tokenHash,
      status: TO_DOMAIN_STATUS[row.status],
      expiresAt: row.expiresAt,
      invitedByAdminId: row.invitedByAdminId,
      acceptedAt: row.acceptedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
