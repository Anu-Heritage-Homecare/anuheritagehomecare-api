import { TwoFactorRecoveryCode as PrismaRow } from '@prisma/client';
import { TwoFactorRecoveryCode } from '../../domain/two-factor-recovery-code.entity';

/** Translates between the Prisma recovery code row and the domain aggregate. */
export class TwoFactorRecoveryCodeMapper {
  static toDomain(row: PrismaRow): TwoFactorRecoveryCode {
    return TwoFactorRecoveryCode.rehydrate(row.id, {
      userId: row.userId,
      codeHash: row.codeHash,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(code: TwoFactorRecoveryCode): PrismaRow {
    return {
      id: code.id,
      userId: code.userId,
      codeHash: code.codeHash,
      usedAt: code.usedAt,
      createdAt: code.createdAt,
    };
  }
}
