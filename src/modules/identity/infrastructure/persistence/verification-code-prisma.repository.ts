import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { VerificationCode } from '../../domain/verification-code.entity';
import { VerificationCodeRepository } from '../../domain/verification-code.repository';
import { VerificationCodeMapper } from './verification-code.mapper';

/** Prisma backed adapter for the VerificationCodeRepository port. */
@Injectable()
export class VerificationCodePrismaRepository implements VerificationCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(code: VerificationCode): Promise<void> {
    const row = VerificationCodeMapper.toPersistence(code);
    await this.prisma.verificationCode.upsert({
      where: { id: row.id },
      create: row,
      update: {
        codeHash: row.codeHash,
        expiresAt: row.expiresAt,
        consumedAt: row.consumedAt,
        attempts: row.attempts,
      },
    });
  }

  async findLatestActive(
    userId: string,
    purpose: VerificationPurpose,
    now: Date,
  ): Promise<VerificationCode | null> {
    const row = await this.prisma.verificationCode.findFirst({
      where: {
        userId,
        purpose: VerificationCodeMapper.toPersistencePurpose(purpose),
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? VerificationCodeMapper.toDomain(row) : null;
  }

  async deleteActiveByUserAndPurpose(userId: string, purpose: VerificationPurpose): Promise<void> {
    await this.prisma.verificationCode.deleteMany({
      where: {
        userId,
        purpose: VerificationCodeMapper.toPersistencePurpose(purpose),
        consumedAt: null,
      },
    });
  }
}
