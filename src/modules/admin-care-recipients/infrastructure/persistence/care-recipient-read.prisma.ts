import { Injectable } from '@nestjs/common';
import {
  CareRecipientPriority as PrismaPriority,
  CareRecipientStatus as PrismaStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import {
  CareRecipientCountsView,
  CareRecipientListQuery,
  CareRecipientPageView,
  CareRecipientReadModel,
  CareRecipientRowView,
} from '../../application/ports/care-recipient-read.port';

const HIGH_PRIORITY: PrismaPriority[] = [
  PrismaPriority.CRITICAL,
  PrismaPriority.URGENT,
  PrismaPriority.HIGH,
];

const TO_DOMAIN_STATUS: Record<PrismaStatus, CareRecipientStatus> = {
  DRAFT: CareRecipientStatus.Draft,
  ACTIVE: CareRecipientStatus.Active,
  ON_HOLD: CareRecipientStatus.OnHold,
  DISCHARGED: CareRecipientStatus.Discharged,
};

const TO_DOMAIN_PRIORITY: Record<PrismaPriority, CareRecipientPriority> = {
  CRITICAL: CareRecipientPriority.Critical,
  URGENT: CareRecipientPriority.Urgent,
  HIGH: CareRecipientPriority.High,
  MEDIUM: CareRecipientPriority.Medium,
  NORMAL: CareRecipientPriority.Normal,
  LOW: CareRecipientPriority.Low,
};

const TO_DOMAIN_FREQUENCY: Record<string, CareFrequency> = {
  ONE_TIME_VISIT: CareFrequency.OneTimeVisit,
  DAILY: CareFrequency.Daily,
  WEEKLY: CareFrequency.Weekly,
  LIVE_IN_CARE: CareFrequency.LiveInCare,
};

/**
 * Prisma read model for the admin care recipients list. Owns the filter, search,
 * sort and pagination query plus the aggregate counts. Every query excludes DRAFT
 * recipients, which are still in the family onboarding wizard.
 */
@Injectable()
export class CareRecipientReadPrisma implements CareRecipientReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listPage(query: CareRecipientListQuery): Promise<CareRecipientPageView> {
    const where = this.whereForTab(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.careRecipient.count({ where }),
      this.prisma.careRecipient.findMany({
        where,
        orderBy: this.orderBy(query),
        skip: Math.max(0, (query.page - 1) * query.pageSize),
        take: query.pageSize,
        select: {
          id: true,
          recipientNumber: true,
          name: true,
          photoKey: true,
          dateOfBirth: true,
          medicalConditions: true,
          careFrequency: true,
          status: true,
          priority: true,
          primaryCaregiverId: true,
          createdAt: true,
        },
      }),
    ]);

    return { total, rows: rows.map((row) => this.toRow(row)) };
  }

  async counts(monthStart: Date, newSince: Date): Promise<CareRecipientCountsView> {
    const notDraft: Prisma.CareRecipientWhereInput = { status: { not: PrismaStatus.DRAFT } };
    const [
      total,
      active,
      onHold,
      discharged,
      newThisMonth,
      highPriority,
      newCount,
      missingCarePlan,
    ] = await this.prisma.$transaction([
      this.prisma.careRecipient.count({ where: notDraft }),
      this.prisma.careRecipient.count({ where: { status: PrismaStatus.ACTIVE } }),
      this.prisma.careRecipient.count({ where: { status: PrismaStatus.ON_HOLD } }),
      this.prisma.careRecipient.count({ where: { status: PrismaStatus.DISCHARGED } }),
      this.prisma.careRecipient.count({ where: { ...notDraft, createdAt: { gte: monthStart } } }),
      this.prisma.careRecipient.count({ where: { ...notDraft, priority: { in: HIGH_PRIORITY } } }),
      this.prisma.careRecipient.count({
        where: { status: PrismaStatus.ACTIVE, createdAt: { gte: newSince } },
      }),
      this.prisma.careRecipient.count({
        where: {
          status: { in: [PrismaStatus.ACTIVE, PrismaStatus.ON_HOLD] },
          careFrequency: null,
        },
      }),
    ]);

    return {
      total,
      active,
      onHold,
      discharged,
      newThisMonth,
      highPriority,
      newCount,
      missingCarePlan,
    };
  }

  private whereForTab(query: CareRecipientListQuery): Prisma.CareRecipientWhereInput {
    const base: Prisma.CareRecipientWhereInput = { status: { not: PrismaStatus.DRAFT } };
    switch (query.tab) {
      case 'ACTIVE':
        base.status = PrismaStatus.ACTIVE;
        break;
      case 'ON_HOLD':
        base.status = PrismaStatus.ON_HOLD;
        break;
      case 'HIGH_PRIORITY':
        base.priority = { in: HIGH_PRIORITY };
        break;
      case 'NEW':
        base.status = PrismaStatus.ACTIVE;
        base.createdAt = { gte: query.newSince };
        break;
      case 'ALL':
      default:
        break;
    }

    const search = query.search?.trim();
    if (search) {
      const or: Prisma.CareRecipientWhereInput[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { medicalConditions: { has: search } },
      ];
      const digits = search.replace(/\D/g, '');
      if (digits.length > 0) {
        or.push({ recipientNumber: Number(digits) });
      }
      base.AND = [{ OR: or }];
    }
    return base;
  }

  private orderBy(query: CareRecipientListQuery): Prisma.CareRecipientOrderByWithRelationInput {
    const dir = query.sortDirection === 'DESC' ? 'desc' : 'asc';
    switch (query.sortField) {
      case 'AGE':
        // Older recipients have an earlier date of birth, so age ascending is
        // date of birth descending.
        return { dateOfBirth: dir === 'asc' ? 'desc' : 'asc' };
      case 'PRIORITY':
        // The enum is declared most urgent first, so priority ascending is most urgent first.
        return { priority: dir };
      case 'STATUS':
        return { status: dir };
      case 'RECENT':
        return { createdAt: dir };
      case 'NAME':
      default:
        return { name: dir };
    }
  }

  private toRow(row: {
    id: string;
    recipientNumber: number;
    name: string;
    photoKey: string | null;
    dateOfBirth: Date;
    medicalConditions: string[];
    careFrequency: string | null;
    status: PrismaStatus;
    priority: PrismaPriority;
    primaryCaregiverId: string | null;
    createdAt: Date;
  }): CareRecipientRowView {
    return {
      id: row.id,
      recipientNumber: row.recipientNumber,
      name: row.name,
      photoKey: row.photoKey,
      dateOfBirth: row.dateOfBirth,
      medicalConditions: row.medicalConditions,
      careFrequency: row.careFrequency === null ? null : TO_DOMAIN_FREQUENCY[row.careFrequency],
      status: TO_DOMAIN_STATUS[row.status],
      priority: TO_DOMAIN_PRIORITY[row.priority],
      primaryCaregiverId: row.primaryCaregiverId,
      createdAt: row.createdAt,
    };
  }
}
