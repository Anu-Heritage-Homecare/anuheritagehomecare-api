import { Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { NotificationChannel } from '../../domain/notification-channel.enum';
import { NotificationSettings } from '../../domain/notification-settings.entity';
import {
  NotificationSettingsRepository,
  NotificationToggleState,
} from '../../domain/notification-settings.repository';
import { GetNotificationsUseCase } from './get-notifications.use-case';
import { SetNotificationToggleUseCase } from './set-notification-toggle.use-case';
import {
  UpdateEmergencyAlertsUseCase,
  UpdateSmsProviderUseCase,
  UpdateVisitReminderRulesUseCase,
} from './update-notification-settings.use-cases';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

class InMemoryRepo implements NotificationSettingsRepository {
  settings: NotificationSettings | null = null;
  toggles = new Map<string, NotificationToggleState>();

  getSettings(): Promise<NotificationSettings | null> {
    return Promise.resolve(this.settings);
  }
  saveSettings(settings: NotificationSettings): Promise<void> {
    this.settings = settings;
    return Promise.resolve();
  }
  listToggles(): Promise<NotificationToggleState[]> {
    return Promise.resolve([...this.toggles.values()]);
  }
  saveToggle(toggle: NotificationToggleState): Promise<void> {
    this.toggles.set(`${toggle.channel}:${toggle.key}`, toggle);
    return Promise.resolve();
  }
}

describe('Notifications flows', () => {
  let repo: InMemoryRepo;

  beforeEach(() => {
    repo = new InMemoryRepo();
  });

  it('returns the catalog with defaults and default settings when nothing is saved', async () => {
    const result = await new GetNotificationsUseCase(repo, clock).execute();
    const email = result.channels.find((c) => c.channel === NotificationChannel.Email);
    expect(email?.types.find((t) => t.key === 'system_updates')?.enabled).toBe(false);
    expect(email?.types.find((t) => t.key === 'new_visit_assigned')?.enabled).toBe(true);
    expect(result.visitReminders.caregiverReminderMinutes).toBe(60);
    expect(result.emergencyAlerts.availableTriggers).toHaveLength(3);
  });

  it('overrides a catalog default with a saved toggle', async () => {
    const result = await new SetNotificationToggleUseCase(repo, clock).execute({
      channel: NotificationChannel.Email,
      key: 'system_updates',
      enabled: true,
    });
    const email = result.channels.find((c) => c.channel === NotificationChannel.Email);
    expect(email?.types.find((t) => t.key === 'system_updates')?.enabled).toBe(true);
  });

  it('rejects a toggle for an unknown notification type', async () => {
    await expect(
      new SetNotificationToggleUseCase(repo, clock).execute({
        channel: NotificationChannel.Sms,
        key: 'not_a_type',
        enabled: true,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('sets the visit reminder rules', async () => {
    const result = await new UpdateVisitReminderRulesUseCase(repo, clock).execute({
      caregiverReminderMinutes: 90,
      coordinatorLateMinutes: 10,
    });
    expect(result.visitReminders.caregiverReminderMinutes).toBe(90);
    expect(result.visitReminders.coordinatorLateMinutes).toBe(10);
    expect(result.visitReminders.familyNotificationMinutes).toBe(30);
  });

  it('sets emergency alert routing and rejects an unknown trigger', async () => {
    const result = await new UpdateEmergencyAlertsUseCase(repo, clock).execute({
      recipients: ['All Coordinators', 'Medical Director'],
      channels: [NotificationChannel.Sms, NotificationChannel.Push],
      triggers: ['sos_button', 'incident_report'],
    });
    expect(result.emergencyAlerts.recipients).toEqual(['All Coordinators', 'Medical Director']);
    expect(result.emergencyAlerts.triggers).toEqual(['sos_button', 'incident_report']);

    await expect(
      new UpdateEmergencyAlertsUseCase(repo, clock).execute({ triggers: ['nope'] }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('sets the SMS provider integration', async () => {
    const result = await new UpdateSmsProviderUseCase(repo, clock).execute({
      name: 'Termii',
      connected: true,
    });
    expect(result.smsProvider).toEqual({ name: 'Termii', connected: true });
  });
});
