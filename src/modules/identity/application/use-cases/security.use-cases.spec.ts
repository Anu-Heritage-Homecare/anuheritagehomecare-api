import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { DeviceSession } from '../../domain/device-session.entity';
import {
  FAKE_DEVICE,
  InMemoryDeviceSessionRepository,
  InMemoryUserRepository,
  fixedClock,
} from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { GetSecurityOverviewUseCase, UpdateSecurityPreferencesUseCase } from './security.use-cases';

function activeSession(id: string, userId: string): DeviceSession {
  const session = DeviceSession.start({
    id,
    userId,
    deviceLabel: FAKE_DEVICE.deviceLabel,
    ipAddress: FAKE_DEVICE.ipAddress,
    userAgent: FAKE_DEVICE.userAgent,
    now: fixedClock.now(),
  });
  session.rotateToken(
    `hash-${id}`,
    new Date(fixedClock.now().getTime() + 86_400_000),
    fixedClock.now(),
  );
  return session;
}

describe('security use cases', () => {
  let users: InMemoryUserRepository;
  let sessions: InMemoryDeviceSessionRepository;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sessions = new InMemoryDeviceSessionRepository();
  });

  it('summarises the account security state including the active device count', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    await sessions.save(activeSession('s1', 'user-1'));
    await sessions.save(activeSession('s2', 'user-1'));

    const overview = await new GetSecurityOverviewUseCase(users, sessions, fixedClock).execute({
      userId: 'user-1',
    });

    expect(overview.twoFactorEnabled).toBe(false);
    expect(overview.biometricEnabled).toBe(false);
    expect(overview.sessionTimeoutMinutes).toBe(15);
    expect(overview.activeDeviceCount).toBe(2);
    expect(overview.passwordChangedAt).toBe(fixedClock.now().toISOString());
  });

  it('updates biometrics and the session timeout, each independently', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    const useCase = new UpdateSecurityPreferencesUseCase(users, fixedClock);

    const afterBiometric = await useCase.execute({ userId: 'user-1', biometricEnabled: true });
    expect(afterBiometric.biometricEnabled).toBe(true);
    expect(afterBiometric.sessionTimeoutMinutes).toBe(15);

    const afterTimeout = await useCase.execute({ userId: 'user-1', sessionTimeoutMinutes: 30 });
    expect(afterTimeout.biometricEnabled).toBe(true);
    expect(afterTimeout.sessionTimeoutMinutes).toBe(30);
  });

  it('rejects an out of range session timeout', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    await expect(
      new UpdateSecurityPreferencesUseCase(users, fixedClock).execute({
        userId: 'user-1',
        sessionTimeoutMinutes: 100000,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects an unknown user', async () => {
    await expect(
      new GetSecurityOverviewUseCase(users, sessions, fixedClock).execute({ userId: 'ghost' }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });
});
