import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  FAKE_DEVICE,
  FakePasswordHasher,
  FakeSecretCipher,
  FakeTokenService,
  FakeTwoFactorAuthenticator,
  FixedOtpGenerator,
  InMemoryDeviceSessionRepository,
  InMemoryTwoFactorRecoveryCodeRepository,
  InMemoryUserRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { TokenIssuerService } from '../services/token-issuer.service';
import { DisableTwoFactorUseCase } from './disable-two-factor.use-case';
import { EnableTwoFactorUseCase } from './enable-two-factor.use-case';
import { SetupTwoFactorUseCase } from './setup-two-factor.use-case';
import { VerifyTwoFactorLoginUseCase } from './verify-two-factor-login.use-case';

const VALID_CODE = '123456';

describe('two factor authentication flow', () => {
  let users: InMemoryUserRepository;
  let recoveryCodes: InMemoryTwoFactorRecoveryCodeRepository;
  let sessions: InMemoryDeviceSessionRepository;
  let authenticator: FakeTwoFactorAuthenticator;
  let cipher: FakeSecretCipher;
  let tokens: FakeTokenService;
  let setup: SetupTwoFactorUseCase;
  let enable: EnableTwoFactorUseCase;
  let disable: DisableTwoFactorUseCase;
  let verifyLogin: VerifyTwoFactorLoginUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    recoveryCodes = new InMemoryTwoFactorRecoveryCodeRepository();
    sessions = new InMemoryDeviceSessionRepository();
    authenticator = new FakeTwoFactorAuthenticator(VALID_CODE);
    cipher = new FakeSecretCipher();
    tokens = new FakeTokenService();
    const otp = new FixedOtpGenerator();
    const tokenIssuer = new TokenIssuerService(
      new FakeTokenService(),
      sessions,
      fixedClock,
      sequentialIds('sid'),
    );

    setup = new SetupTwoFactorUseCase(users, authenticator, cipher, fixedClock);
    enable = new EnableTwoFactorUseCase(
      users,
      authenticator,
      cipher,
      otp,
      tokens,
      recoveryCodes,
      sequentialIds('rc'),
      fixedClock,
    );
    disable = new DisableTwoFactorUseCase(
      users,
      new FakePasswordHasher(),
      recoveryCodes,
      fixedClock,
    );
    verifyLogin = new VerifyTwoFactorLoginUseCase(
      users,
      tokens,
      authenticator,
      cipher,
      recoveryCodes,
      fixedClock,
      tokenIssuer,
    );
  });

  it('sets up, enables, logs in with a code, and disables', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));

    // Setup returns the provisioning material and stores the secret encrypted.
    const setupResult = await setup.execute({ userId: 'user-1' });
    expect(setupResult.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(setupResult.otpauthUri).toContain('otpauth://totp/');
    const afterSetup = await users.findById('user-1');
    expect(afterSetup?.twoFactorEnabled).toBe(false);
    expect(afterSetup?.twoFactorSecret).toBe('enc:JBSWY3DPEHPK3PXP');

    // Enabling proves a code and returns ten recovery codes.
    const enableResult = await enable.execute({ userId: 'user-1', code: VALID_CODE });
    expect(enableResult.recoveryCodes).toHaveLength(10);
    expect((await users.findById('user-1'))?.twoFactorEnabled).toBe(true);
    expect(recoveryCodes.store).toHaveLength(10);

    // Completing a challenged login with a valid code issues tokens.
    const login = await verifyLogin.execute({
      challengeToken: 'mfa:user-1',
      code: VALID_CODE,
      device: FAKE_DEVICE,
    });
    expect(login.accessToken).toBe('access:user-1');
    expect(sessions.store.size).toBe(1);

    // Disabling clears the factor and every recovery code.
    await disable.execute({ userId: 'user-1', password: 'S3curePass' });
    expect((await users.findById('user-1'))?.twoFactorEnabled).toBe(false);
    expect(recoveryCodes.store).toHaveLength(0);
  });

  it('logs in with a recovery code and consumes it', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    await setup.execute({ userId: 'user-1' });
    const { recoveryCodes: codes } = await enable.execute({ userId: 'user-1', code: VALID_CODE });
    const oneCode = codes[0];

    const login = await verifyLogin.execute({
      challengeToken: 'mfa:user-1',
      code: oneCode,
      device: FAKE_DEVICE,
    });
    expect(login.accessToken).toBe('access:user-1');

    // The same recovery code cannot be reused.
    await expect(
      verifyLogin.execute({ challengeToken: 'mfa:user-1', code: oneCode, device: FAKE_DEVICE }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });

  it('rejects an invalid second factor', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    await setup.execute({ userId: 'user-1' });
    await enable.execute({ userId: 'user-1', code: VALID_CODE });

    await expect(
      verifyLogin.execute({ challengeToken: 'mfa:user-1', code: '000000', device: FAKE_DEVICE }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });

  it('rejects enabling with a wrong code', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    await setup.execute({ userId: 'user-1' });

    await expect(enable.execute({ userId: 'user-1', code: '000000' })).rejects.toBeInstanceOf(
      UnauthorizedDomainException,
    );
    expect((await users.findById('user-1'))?.twoFactorEnabled).toBe(false);
  });

  it('refuses to enable before setup has stored a secret', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));

    await expect(enable.execute({ userId: 'user-1', code: VALID_CODE })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('requires the correct password to disable', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    await setup.execute({ userId: 'user-1' });
    await enable.execute({ userId: 'user-1', code: VALID_CODE });

    await expect(
      disable.execute({ userId: 'user-1', password: 'WrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
    expect((await users.findById('user-1'))?.twoFactorEnabled).toBe(true);
  });
});
