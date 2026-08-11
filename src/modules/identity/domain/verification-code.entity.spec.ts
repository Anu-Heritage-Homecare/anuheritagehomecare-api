import { ValidationException } from '@shared/domain/domain-exception';
import { VerificationPurpose } from './verification-purpose.enum';
import { VerificationCode } from './verification-code.entity';

describe('VerificationCode', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  const issue = (): VerificationCode =>
    VerificationCode.issue({
      id: 'code-1',
      userId: 'user-1',
      purpose: VerificationPurpose.EmailVerification,
      codeHash: 'hash',
      now,
      ttlMinutes: 10,
    });

  it('is verifiable within its window with attempts remaining', () => {
    const code = issue();
    expect(() => code.assertVerifiable(now, 5)).not.toThrow();
  });

  it('rejects an expired code', () => {
    const code = issue();
    const later = new Date(now.getTime() + 11 * 60_000);
    expect(() => code.assertVerifiable(later, 5)).toThrow(ValidationException);
  });

  it('rejects a consumed code', () => {
    const code = issue();
    code.consume(now);
    expect(code.consumedAt).toEqual(now);
    expect(() => code.assertVerifiable(now, 5)).toThrow(ValidationException);
  });

  it('rejects once attempts are exhausted', () => {
    const code = issue();
    code.recordFailedAttempt();
    code.recordFailedAttempt();
    expect(code.attempts).toBe(2);
    expect(() => code.assertVerifiable(now, 2)).toThrow(ValidationException);
  });
});
