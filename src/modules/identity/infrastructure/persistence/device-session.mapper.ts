import { DeviceSession as PrismaDeviceSession } from '@prisma/client';
import { DeviceSession } from '../../domain/device-session.entity';

/** Translates between the Prisma device session row and the domain entity. */
export class DeviceSessionMapper {
  static toDomain(row: PrismaDeviceSession): DeviceSession {
    return DeviceSession.rehydrate(row.id, {
      userId: row.userId,
      deviceLabel: row.deviceLabel,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      currentTokenHash: row.currentTokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
    });
  }

  static toPersistence(session: DeviceSession): PrismaDeviceSession {
    return {
      id: session.id,
      userId: session.userId,
      deviceLabel: session.deviceLabel,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      currentTokenHash: session.currentTokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      revokedAt: session.revokedAt,
    };
  }
}
