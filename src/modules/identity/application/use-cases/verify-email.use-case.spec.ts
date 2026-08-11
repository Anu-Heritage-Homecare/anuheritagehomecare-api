import { ValidationException } from '@shared/domain/domain-exception';
import { UserStatus } from '../../domain/user-status.enum';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { VerificationCode } from '../../domain/verification-code.entity';
import {
  FakePasswordHasher,
  InMemoryUserRepository,
  InMemoryVerificationCodeRepository,
  fakeOtpConfig,
  fixedClock,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { VerifyEmailUseCase } from './verify-email.use-case';

describe('VerifyEmailUseCase', () => {
  let users: InMemoryUserRepository;
  let codes: InMemoryVerificationCodeRepository;
  let useCase: VerifyEmailUseCase;

  const seedCode = (): void => {
    const code = VerificationCode.issue({
      id: 'code-1',
      userId: 'user-1',
      purpose: VerificationPurpose.EmailVerification,
      codeHash: 'hashed:123456',
      now: fixedClock.now(),
      ttlMinutes: 10,
    });
    void codes.save(code);
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    codes = new InMemoryVerificationCodeRepository();
    useCase = new VerifyEmailUseCase(
      users,
      codes,
      new FakePasswordHasher(),
      fixedClock,
      fakeOtpConfig(),
    );
  });

  it('verifies the email and activates the account with the correct code', async () => {
    await users.save(buildUser({ verified: false }));
    seedCode();

    const result = await useCase.execute({ email: 'ada.obi@example.com', code: '123456' });

    expect(result.message).toContain('verified');
    const user = await users.findById('user-1');
    expect(user?.emailVerified).toBe(true);
    expect(user?.status).toBe(UserStatus.Active);
  });

  it('rejects an incorrect code and records the failed attempt', async () => {
    await users.save(buildUser({ verified: false }));
    seedCode();

    await expect(
      useCase.execute({ email: 'ada.obi@example.com', code: '000000' }),
    ).rejects.toBeInstanceOf(ValidationException);

    const remaining = await codes.findLatestActive(
      'user-1',
      VerificationPurpose.EmailVerification,
      fixedClock.now(),
    );
    expect(remaining?.attempts).toBe(1);
  });

  it('is idempotent for an already verified account', async () => {
    await users.save(buildUser({ verified: true }));

    const result = await useCase.execute({ email: 'ada.obi@example.com', code: '123456' });
    expect(result.message).toContain('already verified');
  });
});
