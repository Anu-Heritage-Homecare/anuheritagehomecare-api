import { Injectable } from '@nestjs/common';
import { AdminLoginEvent, LoginEventOutcome as PrismaOutcome } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { LoginEventOutcome } from '../../domain/login-event-outcome.enum';
import {
  AdminLoginHistoryReadPort,
  LoginHistoryEntry,
} from '../../application/ports/admin-login-history-read.port';

const TO_DOMAIN_OUTCOME: Record<PrismaOutcome, LoginEventOutcome> = {
  SUCCESS: LoginEventOutcome.Success,
  FAILED: LoginEventOutcome.Failed,
};

/** Prisma read adapter over the admin login events. */
@Injectable()
export class AdminLoginHistoryReadPrisma implements AdminLoginHistoryReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async recent(limit: number): Promise<LoginHistoryEntry[]> {
    const rows = await this.prisma.adminLoginEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => AdminLoginHistoryReadPrisma.toEntry(row));
  }

  async page(
    page: number,
    pageSize: number,
  ): Promise<{ entries: LoginHistoryEntry[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.adminLoginEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.adminLoginEvent.count(),
    ]);
    return { entries: rows.map((row) => AdminLoginHistoryReadPrisma.toEntry(row)), total };
  }

  private static toEntry(row: AdminLoginEvent): LoginHistoryEntry {
    return {
      id: row.id,
      email: row.email,
      operatorName: row.operatorName,
      outcome: TO_DOMAIN_OUTCOME[row.outcome],
      ipAddress: row.ipAddress,
      deviceLabel: row.deviceLabel,
      at: row.createdAt,
    };
  }
}
