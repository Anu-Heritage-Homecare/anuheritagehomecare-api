import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { DeviceSession } from '../../domain/device-session.entity';
import {
  FakePasswordHasher,
  FakeTokenService,
  FixedOtpGenerator,
  InMemoryDeviceSessionRepository,
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
  let sessions: InMemoryDeviceSessionRepository;
  let email: RecordingEmailSender;
  let request: RequestPasswordResetUseCase;
  let verify: VerifyPasswordResetOtpUseCase;
  let reset: ResetPasswordUseCase;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    codes = new InMemoryVerificationCodeRepository();
    sessions = new InMemoryDeviceSessionRepository();
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
    reset = new ResetPasswordUseCase(users, hasher, tokens, sessions, fixedClock);

    await users.save(buildUser({ verified: true }));
    const session = DeviceSession.start({
      id: 'session-1',
      userId: 'user-1',
      deviceLabel: 'Seed device',
      ipAddress: null,
      userAgent: null,
      now: fixedClock.now(),
    });
    session.rotateToken(
      'h:refresh:user-1:1',
      new Date(fixedClock.now().getTime() + 86_400_000),
      fixedClock.now(),
    );
    await sessions.save(session);
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

    const stored = await sessions.findByCurrentTokenHash('h:refresh:user-1:1');
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
