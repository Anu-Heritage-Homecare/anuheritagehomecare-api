import { RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshToken } from '../../domain/refresh-token.entity';

/** Translates between the Prisma refresh token row and the domain entity. */
export class RefreshTokenMapper {
  static toDomain(row: PrismaRefreshToken): RefreshToken {
    return RefreshToken.rehydrate(row.id, {
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(token: RefreshToken): PrismaRefreshToken {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      createdAt: token.createdAt,
    };
  }
}
