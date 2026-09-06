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
  visitUpdates: true,
  caregiverUpdates: true,
  healthAlerts: true,
  medicationReminders: true,
  messages: true,
  carePlanUpdates: true,
  announcements: true,
  invoicesAndPayments: true,
  paymentReminders: true,
  marketingAndOffers: true,
};

const appPrefs = {
  theme: 'LIGHT',
  dateFormat: 'MMM_DD_YYYY',
  timeFormat: 'TWELVE_HOUR',
  soundEnabled: true,
  textSize: 'MEDIUM',
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
    expect(result.notifications.visitUpdates).toBe(true);
    // Marketing is the one category off by default.
    expect(result.notifications.marketingAndOffers).toBe(false);
    // App display defaults.
    expect(result.theme).toBe('LIGHT');
    expect(result.timeFormat).toBe('TWELVE_HOUR');
    expect(result.textSize).toBe('MEDIUM');
    expect(result.soundEnabled).toBe(true);
  });

  it('updates and then reads back the saved preferences', async () => {
    const repo = new InMemoryPreferencesRepository();
    await new UpdatePreferencesUseCase(repo, clock).execute({
      userId: 'user-1',
      notifications: { ...allOn, marketingAndOffers: false, invoicesAndPayments: false },
      language: 'en',
      preferredContactMethod: 'PHONE',
      ...appPrefs,
      theme: 'DARK',
      textSize: 'LARGE',
      soundEnabled: false,
    });

    const result = await new GetPreferencesUseCase(repo, clock).execute({ userId: 'user-1' });
    expect(result.notifications.marketingAndOffers).toBe(false);
    expect(result.notifications.invoicesAndPayments).toBe(false);
    expect(result.notifications.healthAlerts).toBe(true);
    expect(result.preferredContactMethod).toBe('PHONE');
    expect(result.theme).toBe('DARK');
    expect(result.textSize).toBe('LARGE');
    expect(result.soundEnabled).toBe(false);
  });

  it('rejects an unsupported language', async () => {
    await expect(
      new UpdatePreferencesUseCase(new InMemoryPreferencesRepository(), clock).execute({
        userId: 'user-1',
        notifications: allOn,
        language: 'fr',
        preferredContactMethod: 'EMAIL',
        ...appPrefs,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects an unsupported theme', async () => {
    await expect(
      new UpdatePreferencesUseCase(new InMemoryPreferencesRepository(), clock).execute({
        userId: 'user-1',
        notifications: allOn,
        language: 'en',
        preferredContactMethod: 'EMAIL',
        ...appPrefs,
        theme: 'NEON',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
