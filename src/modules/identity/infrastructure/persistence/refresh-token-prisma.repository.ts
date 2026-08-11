import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { RefreshToken } from '../../domain/refresh-token.entity';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import { RefreshTokenMapper } from './refresh-token.mapper';

/** Prisma backed adapter for the RefreshTokenRepository port. */
@Injectable()
export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(token: RefreshToken): Promise<void> {
    const row = RefreshTokenMapper.toPersistence(token);
    await this.prisma.refreshToken.upsert({
      where: { id: row.id },
      create: row,
      update: { revokedAt: row.revokedAt },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
