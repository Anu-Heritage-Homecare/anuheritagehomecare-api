import { Injectable } from '@nestjs/common';
import { HealthEventCategory as PrismaCategory, Prisma } from '@prisma/client';
import { HealthEventCategory } from '@modules/care-recipients/domain/health-event-category.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  HealthEventFilter,
  HealthEventPageView,
  HealthEventReadModel,
  HealthEventRowView,
} from '../../application/ports/health-event-read.port';

const TO_DOMAIN_CATEGORY: Record<PrismaCategory, HealthEventCategory> = {
  VITALS: HealthEventCategory.Vitals,
  ALERT: HealthEventCategory.Alert,
  MEDICATION: HealthEventCategory.Medication,
  INCIDENT: HealthEventCategory.Incident,
  ASSESSMENT: HealthEventCategory.Assessment,
  APPOINTMENT: HealthEventCategory.Appointment,
  SPECIALIST: HealthEventCategory.Specialist,
  CARE: HealthEventCategory.Care,
};

const TO_PERSISTENCE_CATEGORY: Record<HealthEventCategory, PrismaCategory> = {
  [HealthEventCategory.Vitals]: 'VITALS',
  [HealthEventCategory.Alert]: 'ALERT',
  [HealthEventCategory.Medication]: 'MEDICATION',
  [HealthEventCategory.Incident]: 'INCIDENT',
  [HealthEventCategory.Assessment]: 'ASSESSMENT',
  [HealthEventCategory.Appointment]: 'APPOINTMENT',
  [HealthEventCategory.Specialist]: 'SPECIALIST',
  [HealthEventCategory.Care]: 'CARE',
};

/**
 * Prisma read model for the recipient health timeline. Owns the filtered, searched,
 * paginated feed and the next upcoming appointment lookup.
 */
@Injectable()
export class HealthEventReadPrisma implements HealthEventReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listPage(filter: HealthEventFilter): Promise<HealthEventPageView> {
    const where = this.whereForFilter(filter);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.healthEvent.count({ where }),
      this.prisma.healthEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: Math.max(0, (filter.page - 1) * filter.pageSize),
        take: filter.pageSize,
      }),
    ]);
    return { total, rows: rows.map((row) => this.toRow(row)) };
  }

  async nextInCategories(
    recipientId: string,
    now: Date,
    categories: HealthEventCategory[],
  ): Promise<HealthEventRowView | null> {
    if (categories.length === 0) {
      return null;
    }
    const row = await this.prisma.healthEvent.findFirst({
      where: {
        careRecipientId: recipientId,
        category: { in: categories.map((c) => TO_PERSISTENCE_CATEGORY[c]) },
        occurredAt: { gte: now },
      },
      orderBy: { occurredAt: 'asc' },
    });
    return row === null ? null : this.toRow(row);
  }

  private whereForFilter(filter: HealthEventFilter): Prisma.HealthEventWhereInput {
    const where: Prisma.HealthEventWhereInput = { careRecipientId: filter.recipientId };
    if (filter.categories !== null && filter.categories.length > 0) {
      where.category = { in: filter.categories.map((c) => TO_PERSISTENCE_CATEGORY[c]) };
    }
    const search = filter.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private toRow(row: {
    id: string;
    category: PrismaCategory;
    title: string;
    description: string;
    recordedByName: string | null;
    recordedByRole: string | null;
    occurredAt: Date;
  }): HealthEventRowView {
    return {
      id: row.id,
      category: TO_DOMAIN_CATEGORY[row.category],
      title: row.title,
      description: row.description,
      recordedByName: row.recordedByName,
      recordedByRole: row.recordedByRole,
      occurredAt: row.occurredAt,
    };
  }
}
