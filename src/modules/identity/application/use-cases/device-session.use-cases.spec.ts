import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { DeviceSession } from '../../domain/device-session.entity';
import {
  FAKE_DEVICE,
  InMemoryDeviceSessionRepository,
  fixedClock,
} from '../../test-support/doubles';
import {
  ListDevicesUseCase,
  LogoutAllDevicesUseCase,
  RevokeDeviceUseCase,
} from './device-session.use-cases';

function activeSession(id: string, userId: string, lastUsedAt: Date): DeviceSession {
  const session = DeviceSession.start({
    id,
    userId,
    deviceLabel: FAKE_DEVICE.deviceLabel,
    ipAddress: FAKE_DEVICE.ipAddress,
    userAgent: FAKE_DEVICE.userAgent,
    now: lastUsedAt,
  });
  session.rotateToken(
    `hash-${id}`,
    new Date(fixedClock.now().getTime() + 30 * 86_400_000),
    lastUsedAt,
  );
  return session;
}

describe('device session use cases', () => {
  let sessions: InMemoryDeviceSessionRepository;

  beforeEach(() => {
    sessions = new InMemoryDeviceSessionRepository();
  });

  it('lists active devices newest first and flags the current one', async () => {
    await sessions.save(activeSession('s1', 'user-1', new Date('2026-01-01T09:00:00.000Z')));
    await sessions.save(activeSession('s2', 'user-1', new Date('2026-01-01T11:00:00.000Z')));
    await sessions.save(activeSession('other', 'user-2', new Date('2026-01-01T10:00:00.000Z')));

    const views = await new ListDevicesUseCase(sessions, fixedClock).execute({
      userId: 'user-1',
      currentSessionId: 's2',
    });

    expect(views.map((v) => v.id)).toEqual(['s2', 's1']);
    expect(views[0].isCurrent).toBe(true);
    expect(views[1].isCurrent).toBe(false);
    // The other user's device never appears.
    expect(views.some((v) => v.id === 'other')).toBe(false);
  });

  it('revokes a single device, scoped to the owner', async () => {
    await sessions.save(activeSession('s1', 'user-1', fixedClock.now()));
    const revoke = new RevokeDeviceUseCase(sessions, fixedClock);

    // A different user cannot revoke it.
    await expect(revoke.execute({ userId: 'stranger', sessionId: 's1' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );

    await revoke.execute({ userId: 'user-1', sessionId: 's1' });
    expect((await sessions.findById('s1'))?.isActive(fixedClock.now())).toBe(false);
  });

  it('logs out of every device', async () => {
    await sessions.save(activeSession('s1', 'user-1', fixedClock.now()));
    await sessions.save(activeSession('s2', 'user-1', fixedClock.now()));

    const result = await new LogoutAllDevicesUseCase(sessions, fixedClock).execute({
      userId: 'user-1',
    });

    expect(result.message).toContain('signed out');
    expect(await sessions.countActiveForUser('user-1', fixedClock.now())).toBe(0);
  });
});
