import { TwoFactorRecoveryCode } from './two-factor-recovery-code.entity';

/**
 * Persistence port for a user's two factor backup codes. Declared in the domain;
 * infrastructure supplies the Prisma adapter and the application depends only on
 * this abstraction.
 */
export interface TwoFactorRecoveryCodeRepository {
  /** Replace the whole set of codes for a user (issuing a fresh batch). */
  replaceForUser(userId: string, codes: TwoFactorRecoveryCode[]): Promise<void>;
  /** Find an unused code for the user matching the given hash, if any. */
  findActive(userId: string, codeHash: string): Promise<TwoFactorRecoveryCode | null>;
  /** Persist a change to a single code (for example after it is consumed). */
  save(code: TwoFactorRecoveryCode): Promise<void>;
  /** Forget every code for a user (when two factor is turned off). */
  deleteForUser(userId: string): Promise<void>;
}

export const TWO_FACTOR_RECOVERY_CODE_REPOSITORY = Symbol('TWO_FACTOR_RECOVERY_CODE_REPOSITORY');
