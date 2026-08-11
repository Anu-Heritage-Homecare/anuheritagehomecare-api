import {
  VerificationCode as PrismaVerificationCode,
  VerificationPurpose as PrismaVerificationPurpose,
} from '@prisma/client';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { VerificationCode } from '../../domain/verification-code.entity';

/** Translates between the Prisma verification code row and the domain entity. */
export class VerificationCodeMapper {
  static toDomain(row: PrismaVerificationCode): VerificationCode {
    return VerificationCode.rehydrate(row.id, {
      userId: row.userId,
      purpose: VerificationCodeMapper.TO_DOMAIN_PURPOSE[row.purpose],
      codeHash: row.codeHash,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
      attempts: row.attempts,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(code: VerificationCode): PrismaVerificationCode {
    return {
      id: code.id,
      userId: code.userId,
      purpose: VerificationCodeMapper.TO_PERSISTENCE_PURPOSE[code.purpose],
      codeHash: code.codeHash,
      expiresAt: code.expiresAt,
      consumedAt: code.consumedAt,
      attempts: code.attempts,
      createdAt: code.createdAt,
    };
  }

  static toPersistencePurpose(purpose: VerificationPurpose): PrismaVerificationPurpose {
    return VerificationCodeMapper.TO_PERSISTENCE_PURPOSE[purpose];
  }

  private static readonly TO_DOMAIN_PURPOSE: Record<
    PrismaVerificationPurpose,
    VerificationPurpose
  > = {
    EMAIL_VERIFICATION: VerificationPurpose.EmailVerification,
    PASSWORD_RESET: VerificationPurpose.PasswordReset,
  };

  private static readonly TO_PERSISTENCE_PURPOSE: Record<
    VerificationPurpose,
    PrismaVerificationPurpose
  > = {
    [VerificationPurpose.EmailVerification]: 'EMAIL_VERIFICATION',
    [VerificationPurpose.PasswordReset]: 'PASSWORD_RESET',
  };
}
