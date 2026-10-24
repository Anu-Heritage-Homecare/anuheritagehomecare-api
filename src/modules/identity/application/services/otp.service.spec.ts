import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import {
  FakePasswordHasher,
  FixedOtpGenerator,
  InMemoryVerificationCodeRepository,
  RecordingEmailSender,
  fakeOtpConfig,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  const user = buildUser();

  function build(bypassEnabled: boolean): {
    service: OtpService;
    codes: InMemoryVerificationCodeRepository;
    email: RecordingEmailSender;
    hasher: FakePasswordHasher;
  } {
    const codes = new InMemoryVerificationCodeRepository();
    const email = new RecordingEmailSender();
    const hasher = new FakePasswordHasher();
    const service = new OtpService(
      codes,
      new FixedOtpGenerator(),
      hasher,
      email,
      fixedClock,
      sequentialIds('code'),
      fakeOtpConfig({ bypassEnabled }),
    );
    return { service, codes, email, hasher };
  }

  it('generates a code and sends the email when bypass is disabled', async () => {
    const { service, email } = build(false);
    await service.issueAndSend(user, VerificationPurpose.EmailVerification);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe(user.email.value);
  });

  it('stores a fixed all zeros code and sends no email when bypass is enabled', async () => {
    const { service, codes, email, hasher } = build(true);

    await service.issueAndSend(user, VerificationPurpose.EmailVerification);

    expect(email.sent).toHaveLength(0);
    const active = await codes.findLatestActive(
      user.id,
      VerificationPurpose.EmailVerification,
      fixedClock.now(),
    );
    expect(active).not.toBeNull();
    // The stored (hashed) code is the fixed all zeros string verification accepts.
    await expect(hasher.compare('000000', active!.codeHash)).resolves.toBe(true);
  });
});
