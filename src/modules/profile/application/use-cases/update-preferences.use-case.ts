import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  NotificationPreferences,
  ProfilePreferences,
} from '../../domain/profile-preferences.entity';
import {
  PROFILE_PREFERENCES_REPOSITORY,
  ProfilePreferencesRepository,
} from '../../domain/profile-preferences.repository';
import { PreferencesResult, toPreferencesResult } from './get-preferences.use-case';

export interface UpdatePreferencesCommand {
  userId: string;
  notifications: NotificationPreferences;
  language: string;
  preferredContactMethod: string;
  theme: string;
  dateFormat: string;
  timeFormat: string;
  soundEnabled: boolean;
  textSize: string;
}

/**
 * Use case: replace the owner's notification and app preferences. Missing rows
 * are created from defaults first, then updated, so the write is an upsert.
 * Scoped to the authenticated user.
 */
@Injectable()
export class UpdatePreferencesUseCase {
  constructor(
    @Inject(PROFILE_PREFERENCES_REPOSITORY)
    private readonly preferences: ProfilePreferencesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdatePreferencesCommand): Promise<PreferencesResult> {
    const now = this.clock.now();
    const current =
      (await this.preferences.findByUser(command.userId)) ??
      ProfilePreferences.default(command.userId, now);

    current.setNotifications(command.notifications, now);
    current.setLanguage(command.language, now);
    current.setPreferredContactMethod(command.preferredContactMethod, now);
    current.setTheme(command.theme, now);
    current.setDateFormat(command.dateFormat, now);
    current.setTimeFormat(command.timeFormat, now);
    current.setSoundEnabled(command.soundEnabled, now);
    current.setTextSize(command.textSize, now);
    await this.preferences.save(current);

    return toPreferencesResult(current);
  }
}
