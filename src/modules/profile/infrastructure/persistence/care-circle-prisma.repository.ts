import { Injectable } from '@nestjs/common';
import {
  CareAccessLevel as PrismaAccessLevel,
  CareCircleMemberStatus as PrismaMemberStatus,
  CareCircleMember as PrismaCareCircleMember,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCircleMemberStatus } from '../../domain/care-circle-member-status.enum';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CareCircleRepository } from '../../domain/care-circle.repository';

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

const TO_DOMAIN_STATUS: Record<PrismaMemberStatus, CareCircleMemberStatus> = {
  PENDING: CareCircleMemberStatus.Pending,
  ACTIVE: CareCircleMemberStatus.Active,
};

const TO_PERSISTENCE_STATUS: Record<CareCircleMemberStatus, PrismaMemberStatus> = {
  [CareCircleMemberStatus.Pending]: 'PENDING',
  [CareCircleMemberStatus.Active]: 'ACTIVE',
};

/** Prisma backed adapter for the CareCircleRepository port. */
@Injectable()
export class CareCirclePrismaRepository implements CareCircleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForOwner(ownerId: string): Promise<CareCircleMember[]> {
    const rows = await this.prisma.careCircleMember.findMany({
      where: { ownerId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => CareCirclePrismaRepository.toDomain(row));
  }

  async listPendingForOwner(ownerId: string): Promise<CareCircleMember[]> {
    const rows = await this.prisma.careCircleMember.findMany({
      where: { ownerId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => CareCirclePrismaRepository.toDomain(row));
  }

  async findById(id: string): Promise<CareCircleMember | null> {
    const row = await this.prisma.careCircleMember.findUnique({ where: { id } });
    return row === null ? null : CareCirclePrismaRepository.toDomain(row);
  }

  async findMembership(ownerId: string, memberUserId: string): Promise<CareCircleMember | null> {
    const row = await this.prisma.careCircleMember.findUnique({
      where: { ownerId_memberUserId: { ownerId, memberUserId } },
    });
    return row === null ? null : CareCirclePrismaRepository.toDomain(row);
  }

  async save(member: CareCircleMember): Promise<void> {
    const data = {
      ownerId: member.ownerId,
      memberUserId: member.memberUserId,
      relationship: member.relationship,
      accessLevel: TO_PERSISTENCE_LEVEL[member.accessLevel],
      status: TO_PERSISTENCE_STATUS[member.status],
    };
    await this.prisma.careCircleMember.upsert({
      where: { id: member.id },
      create: { id: member.id, ...data },
      update: data,
    });
  }

  async delete(ownerId: string, id: string): Promise<void> {
    await this.prisma.careCircleMember.deleteMany({ where: { id, ownerId } });
  }

  private static toDomain(row: PrismaCareCircleMember): CareCircleMember {
    return CareCircleMember.rehydrate(row.id, {
      ownerId: row.ownerId,
      memberUserId: row.memberUserId,
      relationship: row.relationship,
      accessLevel: TO_DOMAIN_LEVEL[row.accessLevel],
      status: TO_DOMAIN_STATUS[row.status],
      createdAt: row.createdAt,
    });
  }
}
