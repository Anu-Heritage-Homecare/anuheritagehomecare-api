import { Clock } from '@shared/application/ports/clock.port';
import { ProfilePreferences } from '../../domain/profile-preferences.entity';
import { ProfilePreferencesRepository } from '../../domain/profile-preferences.repository';
import { GetPreferencesUseCase } from './get-preferences.use-case';
import { UpdatePhoneToolsUseCase } from './update-phone-tools.use-case';
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

describe('phone tools toggles', () => {
  it('defaults both toggles to true for a new user', async () => {
    const result = await new GetPreferencesUseCase(
      new InMemoryPreferencesRepository(),
      clock,
    ).execute({ userId: 'user-1' });
    expect(result.locationServicesEnabled).toBe(true);
    expect(result.pushNotificationsEnabled).toBe(true);
  });

  it('persists the toggles and reads them back', async () => {
    const repo = new InMemoryPreferencesRepository();
    const result = await new UpdatePhoneToolsUseCase(repo, clock).execute({
      userId: 'user-1',
      locationServicesEnabled: false,
      pushNotificationsEnabled: true,
    });
    expect(result.locationServicesEnabled).toBe(false);
    expect(result.pushNotificationsEnabled).toBe(true);

    const read = await new GetPreferencesUseCase(repo, clock).execute({ userId: 'user-1' });
    expect(read.locationServicesEnabled).toBe(false);
    expect(read.pushNotificationsEnabled).toBe(true);
  });

  it('leaves the phone tools toggles untouched when the full preferences are replaced', async () => {
    const repo = new InMemoryPreferencesRepository();
    await new UpdatePhoneToolsUseCase(repo, clock).execute({
      userId: 'user-1',
      locationServicesEnabled: false,
      pushNotificationsEnabled: false,
    });

    await new UpdatePreferencesUseCase(repo, clock).execute({
      userId: 'user-1',
      notifications: allOn,
      language: 'en',
      preferredContactMethod: 'EMAIL',
      theme: 'DARK',
      dateFormat: 'MMM_DD_YYYY',
      timeFormat: 'TWELVE_HOUR',
      soundEnabled: true,
      textSize: 'MEDIUM',
    });

    const read = await new GetPreferencesUseCase(repo, clock).execute({ userId: 'user-1' });
    expect(read.theme).toBe('DARK');
    // The full preferences replace does not reset the phone tools toggles.
    expect(read.locationServicesEnabled).toBe(false);
    expect(read.pushNotificationsEnabled).toBe(false);
  });
});
