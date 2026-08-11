import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { RefreshToken } from '../../domain/refresh-token.entity';
import {
  FakePasswordHasher,
  FakeTokenService,
  FixedOtpGenerator,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  InMemoryVerificationCodeRepository,
  RecordingEmailSender,
  fakeOtpConfig,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { OtpService } from '../services/otp.service';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { VerifyPasswordResetOtpUseCase } from './verify-password-reset-otp.use-case';

describe('Password reset flow', () => {
  let users: InMemoryUserRepository;
  let codes: InMemoryVerificationCodeRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let email: RecordingEmailSender;
  let request: RequestPasswordResetUseCase;
  let verify: VerifyPasswordResetOtpUseCase;
  let reset: ResetPasswordUseCase;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    codes = new InMemoryVerificationCodeRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    email = new RecordingEmailSender();
    const hasher = new FakePasswordHasher();
    const tokens = new FakeTokenService();

    const otpService = new OtpService(
      codes,
      new FixedOtpGenerator(),
      hasher,
      email,
      fixedClock,
      sequentialIds('code'),
      fakeOtpConfig(),
    );
    request = new RequestPasswordResetUseCase(users, otpService);
    verify = new VerifyPasswordResetOtpUseCase(
      users,
      codes,
      hasher,
      tokens,
      fixedClock,
      fakeOtpConfig(),
    );
    reset = new ResetPasswordUseCase(users, hasher, tokens, refreshTokens, fixedClock);

    await users.save(buildUser({ verified: true }));
    await refreshTokens.save(
      RefreshToken.issue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'h:refresh:user-1:1',
        expiresAt: new Date(fixedClock.now().getTime() + 86_400_000),
        now: fixedClock.now(),
      }),
    );
  });

  it('resets the password and revokes existing sessions end to end', async () => {
    await request.execute({ email: 'ada.obi@example.com' });
    expect(email.sent).toHaveLength(1);

    const { resetToken } = await verify.execute({ email: 'ada.obi@example.com', code: '123456' });
    expect(resetToken).toBe('reset:user-1');

    const result = await reset.execute({ resetToken, newPassword: 'N3wSecure' });
    expect(result.message).toContain('reset');

    const user = await users.findById('user-1');
    expect(user?.passwordHash).toBe('hashed:N3wSecure');

    const stored = await refreshTokens.findByTokenHash('h:refresh:user-1:1');
    expect(stored?.isActive(fixedClock.now())).toBe(false);
  });

  it('does not disclose whether an account exists', async () => {
    await request.execute({ email: 'nobody@example.com' });
    expect(email.sent).toHaveLength(0);
  });

  it('rejects an incorrect reset code', async () => {
    await request.execute({ email: 'ada.obi@example.com' });
    await expect(
      verify.execute({ email: 'ada.obi@example.com', code: '000000' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a tampered reset token', async () => {
    await expect(
      reset.execute({ resetToken: 'not-a-valid-token', newPassword: 'N3wSecure' }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });
});
