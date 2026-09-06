import {
  EmailNotVerifiedException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
import {
  FAKE_DEVICE,
  FakePasswordHasher,
  FakeTokenService,
  InMemoryDeviceSessionRepository,
  InMemoryLoginEventRepository,
  InMemoryUserRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { LoginEventRecorder } from '../services/login-event-recorder.service';
import { TokenIssuerService } from '../services/token-issuer.service';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let users: InMemoryUserRepository;
  let sessions: InMemoryDeviceSessionRepository;
  let loginEvents: InMemoryLoginEventRepository;
  let useCase: LoginUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sessions = new InMemoryDeviceSessionRepository();
    loginEvents = new InMemoryLoginEventRepository();
    const tokenIssuer = new TokenIssuerService(
      new FakeTokenService(),
      sessions,
      fixedClock,
      sequentialIds('sid'),
    );
    const recorder = new LoginEventRecorder(loginEvents, sequentialIds('le'), fixedClock);
    useCase = new LoginUseCase(
      users,
      new FakePasswordHasher(),
      new FakeTokenService(),
      tokenIssuer,
      recorder,
    );
  });

  it('issues tokens for a verified user with the correct password', async () => {
    await users.save(buildUser({ verified: true }));

    const result = await useCase.execute({
      email: 'ada.obi@example.com',
      password: 'S3curePass',
      device: FAKE_DEVICE,
    });

    if (result.status !== 'AUTHENTICATED') {
      throw new Error('expected the user to be authenticated');
    }
    expect(result.tokens.tokenType).toBe('Bearer');
    expect(result.tokens.accessToken).toBe('access:user-1');
    expect(result.tokens.refreshToken).toContain('refresh:user-1');
    expect(result.tokens.user.email).toBe('ada.obi@example.com');
    expect(sessions.store.size).toBe(1);
    // A successful login is recorded in the audit log.
    expect(loginEvents.store).toHaveLength(1);
    expect(loginEvents.store[0].outcome).toBe('SUCCESS');
  });

  it('surfaces mustChangePassword so the client can force a password change', async () => {
    await users.save(buildUser({ verified: true, mustChangePassword: true }));

    const result = await useCase.execute({
      email: 'ada.obi@example.com',
      password: 'S3curePass',
      device: FAKE_DEVICE,
    });

    if (result.status !== 'AUTHENTICATED') {
      throw new Error('expected the user to be authenticated');
    }
    expect(result.tokens.user.mustChangePassword).toBe(true);
  });

  it('returns a two factor challenge instead of tokens when two factor is enabled', async () => {
    await users.save(buildUser({ verified: true, twoFactorEnabled: true, twoFactorSecret: 'enc' }));

    const result = await useCase.execute({
      email: 'ada.obi@example.com',
      password: 'S3curePass',
      device: FAKE_DEVICE,
    });

    expect(result.status).toBe('TWO_FACTOR_REQUIRED');
    if (result.status !== 'TWO_FACTOR_REQUIRED') {
      throw new Error('expected a two factor challenge');
    }
    expect(result.challengeToken).toBe('mfa:user-1');
    // No session is created until the second factor is proven.
    expect(sessions.store.size).toBe(0);
  });

  it('blocks login until the email is verified', async () => {
    await users.save(buildUser({ verified: false }));

    await expect(
      useCase.execute({
        email: 'ada.obi@example.com',
        password: 'S3curePass',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedException);
  });

  it('rejects a wrong password without revealing the account', async () => {
    await users.save(buildUser({ verified: true }));

    await expect(
      useCase.execute({
        email: 'ada.obi@example.com',
        password: 'WrongPass1',
        device: FAKE_DEVICE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
    // The failed attempt is recorded against the known account.
    expect(loginEvents.store).toHaveLength(1);
    expect(loginEvents.store[0].outcome).toBe('FAILURE');
  });

  it('rejects an unknown email identically to a wrong password', async () => {
    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'S3curePass', device: FAKE_DEVICE }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
    // An unknown email cannot be attributed, so nothing is logged.
    expect(loginEvents.store).toHaveLength(0);
  });
});
