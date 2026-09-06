import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { DeviceSession } from '../../domain/device-session.entity';
import { DeviceSessionRepository } from '../../domain/device-session.repository';
import { DeviceSessionMapper } from './device-session.mapper';

/** Prisma backed adapter for the DeviceSessionRepository port. */
@Injectable()
export class DeviceSessionPrismaRepository implements DeviceSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: DeviceSession): Promise<void> {
    const row = DeviceSessionMapper.toPersistence(session);
    await this.prisma.deviceSession.upsert({
      where: { id: row.id },
      create: row,
      update: {
        deviceLabel: row.deviceLabel,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        currentTokenHash: row.currentTokenHash,
        expiresAt: row.expiresAt,
        lastUsedAt: row.lastUsedAt,
        revokedAt: row.revokedAt,
      },
    });
  }

  async findById(id: string): Promise<DeviceSession | null> {
    const row = await this.prisma.deviceSession.findUnique({ where: { id } });
    return row ? DeviceSessionMapper.toDomain(row) : null;
  }

  async findByCurrentTokenHash(tokenHash: string): Promise<DeviceSession | null> {
    const row = await this.prisma.deviceSession.findUnique({
      where: { currentTokenHash: tokenHash },
    });
    return row ? DeviceSessionMapper.toDomain(row) : null;
  }

  async listActiveForUser(userId: string, now: Date): Promise<DeviceSession[]> {
    const rows = await this.prisma.deviceSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return rows.map((row) => DeviceSessionMapper.toDomain(row));
  }

  async countActiveForUser(userId: string, now: Date): Promise<number> {
    return this.prisma.deviceSession.count({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
    });
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
