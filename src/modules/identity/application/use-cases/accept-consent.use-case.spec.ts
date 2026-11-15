import { Clock } from '@shared/application/ports/clock.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { InMemoryUserRepository } from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { AcceptConsentUseCase } from './accept-consent.use-case';

const photos: PhotoStorage = {
  createUploadTicket: () => ({ uploadUrl: '', fields: {}, key: '' }),
  urlFor: (key) => (key.length === 0 ? '' : `https://cdn/${key}`),
  download: () => Promise.resolve(Buffer.from('')),
};

const FIRST = new Date('2026-11-15T09:30:00.000Z');
const LATER = new Date('2026-11-20T12:00:00.000Z');

describe('AcceptConsentUseCase', () => {
  let users: InMemoryUserRepository;
  let now: Date;
  const clock: Clock = { now: () => now };
  let useCase: AcceptConsentUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    now = FIRST;
    useCase = new AcceptConsentUseCase(users, photos, clock);
  });

  it('records the acceptance timestamp and returns the updated profile', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));

    const profile = await useCase.execute({ userId: 'user-1' });

    expect(profile.consentAcceptedAt).toBe(FIRST.toISOString());
    const saved = await users.findById('user-1');
    expect(saved?.consentAcceptedAt).toEqual(FIRST);
  });

  it('keeps the first acceptance timestamp when accepted again (idempotent)', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));
    await useCase.execute({ userId: 'user-1' });

    now = LATER;
    const profile = await useCase.execute({ userId: 'user-1' });

    expect(profile.consentAcceptedAt).toBe(FIRST.toISOString());
  });

  it('treats a token whose user no longer exists as unauthorized', async () => {
    await expect(useCase.execute({ userId: 'ghost' })).rejects.toBeInstanceOf(
      UnauthorizedDomainException,
    );
  });
});
