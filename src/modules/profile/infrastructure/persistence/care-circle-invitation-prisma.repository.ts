import { Injectable } from '@nestjs/common';
import {
  CareAccessLevel as PrismaAccessLevel,
  CareCircleInvitation as PrismaInvitation,
  InvitationStatus as PrismaInvitationStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCircleInvitation, InvitationStatus } from '../../domain/care-circle-invitation.entity';
import { CareCircleInvitationRepository } from '../../domain/care-circle-invitation.repository';

const TO_DOMAIN_LEVEL: Record<PrismaAccessLevel, CareAccessLevel> = {
  LIMITED: CareAccessLevel.Limited,
  VIEW_ONLY: CareAccessLevel.ViewOnly,
  FULL: CareAccessLevel.Full,
};
const TO_PERSISTENCE_LEVEL: Record<CareAccessLevel, PrismaAccessLevel> = {
  [CareAccessLevel.Limited]: 'LIMITED',
  [CareAccessLevel.ViewOnly]: 'VIEW_ONLY',
  [CareAccessLevel.Full]: 'FULL',
};
const TO_DOMAIN_STATUS: Record<PrismaInvitationStatus, InvitationStatus> = {
  PENDING: InvitationStatus.Pending,
  ACCEPTED: InvitationStatus.Accepted,
  REVOKED: InvitationStatus.Revoked,
};
const TO_PERSISTENCE_STATUS: Record<InvitationStatus, PrismaInvitationStatus> = {
  [InvitationStatus.Pending]: 'PENDING',
  [InvitationStatus.Accepted]: 'ACCEPTED',
  [InvitationStatus.Revoked]: 'REVOKED',
};

/** Prisma backed adapter for the CareCircleInvitationRepository port. */
@Injectable()
export class CareCircleInvitationPrismaRepository implements CareCircleInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(invitation: CareCircleInvitation): Promise<void> {
    const data = {
      ownerId: invitation.ownerId,
      email: invitation.email,
      relationship: invitation.relationship,
      accessLevel: TO_PERSISTENCE_LEVEL[invitation.accessLevel],
      token: invitation.token,
      status: TO_PERSISTENCE_STATUS[invitation.status],
      invitedAt: invitation.invitedAt,
      acceptedAt: invitation.acceptedAt,
      acceptedByUserId: invitation.acceptedByUserId,
    };
    await this.prisma.careCircleInvitation.upsert({
      where: { id: invitation.id },
      create: { id: invitation.id, ...data },
      update: data,
    });
  }

  async findById(id: string): Promise<CareCircleInvitation | null> {
    const row = await this.prisma.careCircleInvitation.findUnique({ where: { id } });
    return row === null ? null : CareCircleInvitationPrismaRepository.toDomain(row);
  }

  async findByToken(token: string): Promise<CareCircleInvitation | null> {
    const row = await this.prisma.careCircleInvitation.findUnique({ where: { token } });
    return row === null ? null : CareCircleInvitationPrismaRepository.toDomain(row);
  }

  async listPendingForOwner(ownerId: string): Promise<CareCircleInvitation[]> {
    const rows = await this.prisma.careCircleInvitation.findMany({
      where: { ownerId, status: 'PENDING' },
      orderBy: { invitedAt: 'desc' },
    });
    return rows.map((row) => CareCircleInvitationPrismaRepository.toDomain(row));
  }

  private static toDomain(row: PrismaInvitation): CareCircleInvitation {
    return CareCircleInvitation.rehydrate(row.id, {
      ownerId: row.ownerId,
      email: row.email,
      relationship: row.relationship,
      accessLevel: TO_DOMAIN_LEVEL[row.accessLevel],
      token: row.token,
      status: TO_DOMAIN_STATUS[row.status],
      invitedAt: row.invitedAt,
      acceptedAt: row.acceptedAt,
      acceptedByUserId: row.acceptedByUserId,
    });
  }
}
