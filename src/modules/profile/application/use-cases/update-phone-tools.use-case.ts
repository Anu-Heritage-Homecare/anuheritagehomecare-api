import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ProfilePreferences } from '../../domain/profile-preferences.entity';
import {
  PROFILE_PREFERENCES_REPOSITORY,
  ProfilePreferencesRepository,
} from '../../domain/profile-preferences.repository';
import { PreferencesResult, toPreferencesResult } from './get-preferences.use-case';

export interface UpdatePhoneToolsCommand {
  userId: string;
  locationServicesEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

/**
 * Use case: persist the two onboarding phone tools toggles (device location and
 * push notifications). A missing preferences row is created from defaults first,
 * so the write is an upsert that leaves the owner's other preferences untouched.
 * Scoped to the authenticated user.
 */
@Injectable()
export class UpdatePhoneToolsUseCase {
  constructor(
    @Inject(PROFILE_PREFERENCES_REPOSITORY)
    private readonly preferences: ProfilePreferencesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdatePhoneToolsCommand): Promise<PreferencesResult> {
    const now = this.clock.now();
    const current =
      (await this.preferences.findByUser(command.userId)) ??
      ProfilePreferences.default(command.userId, now);

    current.setPhoneTools(command.locationServicesEnabled, command.pushNotificationsEnabled, now);
    await this.preferences.save(current);

    return toPreferencesResult(current);
  }
}
