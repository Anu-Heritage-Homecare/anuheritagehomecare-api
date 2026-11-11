import { Injectable } from '@nestjs/common';
import { AdminAuditEvent, AuditCategory as PrismaCategory } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AuditCategory } from '../../domain/audit-category.enum';
import { AdminAuditReadPort, AuditLogEntry } from '../../application/ports/admin-audit-read.port';
import { AuditEventInput, AuditRecorder } from '../../application/ports/audit-recorder.port';

const TO_DOMAIN_CATEGORY: Record<PrismaCategory, AuditCategory> = {
  SECURITY: AuditCategory.Security,
  INTEGRATIONS: AuditCategory.Integrations,
  USERS: AuditCategory.Users,
  BILLING: AuditCategory.Billing,
  OPERATIONS: AuditCategory.Operations,
  OTHER: AuditCategory.Other,
};
const TO_PRISMA_CATEGORY: Record<AuditCategory, PrismaCategory> = {
  [AuditCategory.Security]: 'SECURITY',
  [AuditCategory.Integrations]: 'INTEGRATIONS',
  [AuditCategory.Users]: 'USERS',
  [AuditCategory.Billing]: 'BILLING',
  [AuditCategory.Operations]: 'OPERATIONS',
  [AuditCategory.Other]: 'OTHER',
};

/** Prisma adapter that both appends to and reads the admin audit trail. */
@Injectable()
export class AdminAuditPrisma implements AuditRecorder, AdminAuditReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEventInput): Promise<void> {
    await this.prisma.adminAuditEvent.create({
      data: {
        actorAdminId: event.actorAdminId,
        actorName: event.actorName,
        category: TO_PRISMA_CATEGORY[event.category],
        action: event.action,
        summary: event.summary,
        ipAddress: event.ipAddress ?? null,
      },
    });
  }

  async page(
    page: number,
    pageSize: number,
    category: AuditCategory | null,
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const where = category === null ? {} : { category: TO_PRISMA_CATEGORY[category] };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.adminAuditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.adminAuditEvent.count({ where }),
    ]);
    return { entries: rows.map((row) => AdminAuditPrisma.toEntry(row)), total };
  }

  private static toEntry(row: AdminAuditEvent): AuditLogEntry {
    return {
      id: row.id,
      actorName: row.actorName,
      category: TO_DOMAIN_CATEGORY[row.category],
      action: row.action,
      summary: row.summary,
      ipAddress: row.ipAddress,
      at: row.createdAt,
    };
  }
}
