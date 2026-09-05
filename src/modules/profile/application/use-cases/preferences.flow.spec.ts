import { Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { ProfilePreferences } from '../../domain/profile-preferences.entity';
import { ProfilePreferencesRepository } from '../../domain/profile-preferences.repository';
import { GetPreferencesUseCase } from './get-preferences.use-case';
import { UpdatePreferencesUseCase } from './update-preferences.use-case';

const clock: Clock = { now: () => new Date('2026-09-05T00:00:00.000Z') };

class InMemoryPreferencesRepository implements ProfilePreferencesRepository {
  public readonly store = new Map<string, ProfilePreferences>();
  findByUser(userId: string): Promise<ProfilePreferences | null> {
    return Promise.resolve(this.store.get(userId) ?? null);
  }
  save(preferences: ProfilePreferences): Promise<void> {
    this.store.set(preferences.id, preferences);
    return Promise.resolve();
  }
}

const allOn = {
  push: true,
  email: true,
  sms: true,
  visitUpdates: true,
  careAlerts: true,
  billingAlerts: true,
  messageAlerts: true,
};

describe('profile preferences', () => {
  it('returns defaults for a user who has never set preferences', async () => {
    const result = await new GetPreferencesUseCase(
      new InMemoryPreferencesRepository(),
      clock,
    ).execute({
      userId: 'user-1',
    });
    expect(result.language).toBe('en');
    expect(result.notifications.push).toBe(true);
    expect(result.notifications.sms).toBe(false);
  });

  it('updates and then reads back the saved preferences', async () => {
    const repo = new InMemoryPreferencesRepository();
    await new UpdatePreferencesUseCase(repo, clock).execute({
      userId: 'user-1',
      notifications: { ...allOn, sms: false, billingAlerts: false },
      language: 'en',
      preferredContactMethod: 'PHONE',
    });

    const result = await new GetPreferencesUseCase(repo, clock).execute({ userId: 'user-1' });
    expect(result.notifications.sms).toBe(false);
    expect(result.notifications.billingAlerts).toBe(false);
    expect(result.preferredContactMethod).toBe('PHONE');
  });

  it('rejects an unsupported language', async () => {
    await expect(
      new UpdatePreferencesUseCase(new InMemoryPreferencesRepository(), clock).execute({
        userId: 'user-1',
        notifications: allOn,
        language: 'fr',
        preferredContactMethod: 'EMAIL',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
