import { ConflictDomainException, ValidationException } from '@shared/domain/domain-exception';
import { UserStatus } from '../../domain/user-status.enum';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import {
  FixedOtpGenerator,
  InMemoryUserRepository,
  InMemoryVerificationCodeRepository,
  FakePasswordHasher,
  RecordingEmailSender,
  fakeOtpConfig,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { RegisterFamilyOwnerCommand } from '../commands/register-family-owner.command';
import { OtpService } from '../services/otp.service';
import { RegisterFamilyOwnerUseCase } from './register-family-owner.use-case';

describe('RegisterFamilyOwnerUseCase', () => {
  let users: InMemoryUserRepository;
  let codes: InMemoryVerificationCodeRepository;
  let email: RecordingEmailSender;
  let useCase: RegisterFamilyOwnerUseCase;

  const command: RegisterFamilyOwnerCommand = {
    firstName: 'Ada',
    lastName: 'Obi',
    email: 'ada.obi@example.com',
    phone: '+2348031234567',
    addressLine1: '12 Marina Road',
    city: 'Lagos',
    state: 'Lagos',
    postalCode: '101233',
    country: 'NG',
    password: 'S3curePass',
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    codes = new InMemoryVerificationCodeRepository();
    email = new RecordingEmailSender();
    const hasher = new FakePasswordHasher();
    const otpService = new OtpService(
      codes,
      new FixedOtpGenerator(),
      hasher,
      email,
      fixedClock,
      sequentialIds('code'),
      fakeOtpConfig(),
    );
    useCase = new RegisterFamilyOwnerUseCase(
      users,
      hasher,
      fixedClock,
      sequentialIds('user'),
      otpService,
    );
  });

  it('creates an unverified account and dispatches a verification code', async () => {
    const result = await useCase.execute(command);

    expect(result.emailVerificationRequired).toBe(true);

    const saved = await users.findByEmail('ada.obi@example.com');
    expect(saved).not.toBeNull();
    expect(saved?.emailVerified).toBe(false);
    expect(saved?.status).toBe(UserStatus.PendingVerification);
    expect(saved?.isFamilyOwner).toBe(true);
    expect(saved?.passwordHash).toBe('hashed:S3curePass');

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('ada.obi@example.com');

    const activeCode = await codes.findLatestActive(
      saved!.id,
      VerificationPurpose.EmailVerification,
      fixedClock.now(),
    );
    expect(activeCode).not.toBeNull();
  });

  it('rejects a duplicate email', async () => {
    await useCase.execute(command);
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(ConflictDomainException);
  });

  it('rejects a phone number outside the United States and Nigeria', async () => {
    await expect(useCase.execute({ ...command, phone: '+447911123456' })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });
});
