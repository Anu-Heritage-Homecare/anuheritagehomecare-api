import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import {
  DEVICE_SESSION_REPOSITORY,
  DeviceSessionRepository,
} from '../../domain/device-session.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

export interface SecurityOverview {
  twoFactorEnabled: boolean;
  passwordChangedAt: string;
  biometricEnabled: boolean;
  sessionTimeoutMinutes: number;
  activeDeviceCount: number;
}

export interface SecurityPreferences {
  biometricEnabled: boolean;
  sessionTimeoutMinutes: number;
}

/**
 * Use case: the Account Security overview. Composes the account's two factor
 * state and password age with the count of active devices, so the screen can show
 * its badges in one read. Scoped to the authenticated user.
 */
@Injectable()
export class GetSecurityOverviewUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: { userId: string }): Promise<SecurityOverview> {
    const user = await this.users.findById(query.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }
    const activeDeviceCount = await this.sessions.countActiveForUser(
      query.userId,
      this.clock.now(),
    );
    return {
      twoFactorEnabled: user.twoFactorEnabled,
      passwordChangedAt: user.passwordChangedAt.toISOString(),
      biometricEnabled: user.biometricEnabled,
      sessionTimeoutMinutes: user.sessionTimeoutMinutes,
      activeDeviceCount,
    };
  }
}

/**
 * Use case: update the account's security preferences (the Face ID toggle and the
 * session timeout). Both are optional so either can be changed alone. Scoped to
 * the authenticated user.
 */
@Injectable()
export class UpdateSecurityPreferencesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: {
    userId: string;
    biometricEnabled?: boolean;
    sessionTimeoutMinutes?: number;
  }): Promise<SecurityPreferences> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }
    const now = this.clock.now();
    if (command.biometricEnabled !== undefined) {
      user.setBiometricEnabled(command.biometricEnabled, now);
    }
    if (command.sessionTimeoutMinutes !== undefined) {
      user.setSessionTimeoutMinutes(command.sessionTimeoutMinutes, now);
    }
    await this.users.save(user);
    return {
      biometricEnabled: user.biometricEnabled,
      sessionTimeoutMinutes: user.sessionTimeoutMinutes,
    };
  }
}
