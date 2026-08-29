import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { TwoFactorRecoveryCode } from '../../domain/two-factor-recovery-code.entity';
import { TwoFactorRecoveryCodeRepository } from '../../domain/two-factor-recovery-code.repository';
import { TwoFactorRecoveryCodeMapper } from './two-factor-recovery-code.mapper';

/**
 * Prisma backed adapter for the recovery code port. Issuing a fresh batch
 * replaces the old set atomically; a used code is persisted individually.
 */
@Injectable()
export class TwoFactorRecoveryCodePrismaRepository implements TwoFactorRecoveryCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForUser(userId: string, codes: TwoFactorRecoveryCode[]): Promise<void> {
    const rows = codes.map((code) => TwoFactorRecoveryCodeMapper.toPersistence(code));
    await this.prisma.$transaction([
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorRecoveryCode.createMany({ data: rows }),
    ]);
  }

  async findActive(userId: string, codeHash: string): Promise<TwoFactorRecoveryCode | null> {
    const row = await this.prisma.twoFactorRecoveryCode.findFirst({
      where: { userId, codeHash, usedAt: null },
    });
    return row ? TwoFactorRecoveryCodeMapper.toDomain(row) : null;
  }

  async save(code: TwoFactorRecoveryCode): Promise<void> {
    const row = TwoFactorRecoveryCodeMapper.toPersistence(code);
    await this.prisma.twoFactorRecoveryCode.update({
      where: { id: row.id },
      data: { usedAt: row.usedAt },
    });
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } });
  }
}
