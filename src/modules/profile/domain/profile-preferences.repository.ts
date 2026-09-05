import { ProfilePreferences } from './profile-preferences.entity';

/** Persistence port for a user's profile preferences. */
export interface ProfilePreferencesRepository {
  findByUser(userId: string): Promise<ProfilePreferences | null>;
  save(preferences: ProfilePreferences): Promise<void>;
}

export const PROFILE_PREFERENCES_REPOSITORY = Symbol('PROFILE_PREFERENCES_REPOSITORY');
