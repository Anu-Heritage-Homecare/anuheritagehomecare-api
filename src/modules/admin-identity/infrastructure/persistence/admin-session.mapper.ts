import { AdminSession as PrismaAdminSession } from '@prisma/client';
import { AdminSession } from '../../domain/admin-session.entity';

/**
 * Translates between the Prisma AdminSession row and the AdminSession aggregate.
 * The only place that knows both shapes.
 */
export class AdminSessionMapper {
  static toDomain(row: PrismaAdminSession): AdminSession {
    return AdminSession.rehydrate(row.id, {
      adminUserId: row.adminUserId,
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

  static toPersistence(session: AdminSession): PrismaAdminSession {
    return {
      id: session.id,
      adminUserId: session.adminUserId,
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
