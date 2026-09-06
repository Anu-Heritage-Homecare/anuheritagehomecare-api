import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AdminSession } from '../../domain/admin-session.entity';
import { AdminSessionRepository } from '../../domain/admin-session.repository';
import { AdminSessionMapper } from './admin-session.mapper';

/**
 * Prisma backed adapter for the AdminSessionRepository port. `save` upserts so a
 * session is created on first issue and rotated in place on every refresh.
 */
@Injectable()
export class AdminSessionPrismaRepository implements AdminSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: AdminSession): Promise<void> {
    const row = AdminSessionMapper.toPersistence(session);
    await this.prisma.adminSession.upsert({
      where: { id: row.id },
      create: row,
      update: {
        currentTokenHash: row.currentTokenHash,
        expiresAt: row.expiresAt,
        lastUsedAt: row.lastUsedAt,
        revokedAt: row.revokedAt,
      },
    });
  }

  async findByCurrentTokenHash(tokenHash: string): Promise<AdminSession | null> {
    const row = await this.prisma.adminSession.findUnique({
      where: { currentTokenHash: tokenHash },
    });
    return row ? AdminSessionMapper.toDomain(row) : null;
  }

  async revokeAllForAdmin(adminUserId: string, now: Date): Promise<void> {
    await this.prisma.adminSession.updateMany({
      where: { adminUserId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
