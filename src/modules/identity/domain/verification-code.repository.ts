import { VerificationPurpose } from './verification-purpose.enum';
import { VerificationCode } from './verification-code.entity';

/**
 * Persistence port for one time passcodes. Only one active code per user and
 * purpose is expected at a time; issuing a new code clears any outstanding ones.
 */
export interface VerificationCodeRepository {
  save(code: VerificationCode): Promise<void>;
  findLatestActive(
    userId: string,
    purpose: VerificationPurpose,
    now: Date,
  ): Promise<VerificationCode | null>;
  deleteActiveByUserAndPurpose(userId: string, purpose: VerificationPurpose): Promise<void>;
}

export const VERIFICATION_CODE_REPOSITORY = Symbol('VERIFICATION_CODE_REPOSITORY');
