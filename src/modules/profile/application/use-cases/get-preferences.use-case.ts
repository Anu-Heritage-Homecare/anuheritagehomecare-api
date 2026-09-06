import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotificationPreferences } from '../../domain/profile-preferences.entity';
import {
  PROFILE_PREFERENCES_REPOSITORY,
  ProfilePreferencesRepository,
} from '../../domain/profile-preferences.repository';
import { ProfilePreferences } from '../../domain/profile-preferences.entity';

export interface PreferencesResult {
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
 * Use case: read the owner's notification and app preferences, returning sensible
 * defaults when they have never changed them. Scoped to the authenticated user.
 */
@Injectable()
export class GetPreferencesUseCase {
  constructor(
    @Inject(PROFILE_PREFERENCES_REPOSITORY)
    private readonly preferences: ProfilePreferencesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: { userId: string }): Promise<PreferencesResult> {
    const stored =
      (await this.preferences.findByUser(query.userId)) ??
      ProfilePreferences.default(query.userId, this.clock.now());
    return toPreferencesResult(stored);
  }
}

/** Projects the aggregate into the result shape shared by the read and the write. */
export function toPreferencesResult(stored: ProfilePreferences): PreferencesResult {
  return {
    notifications: stored.notifications,
    language: stored.language,
    preferredContactMethod: stored.preferredContactMethod,
    theme: stored.theme,
    dateFormat: stored.dateFormat,
    timeFormat: stored.timeFormat,
    soundEnabled: stored.soundEnabled,
    textSize: stored.textSize,
  };
}
