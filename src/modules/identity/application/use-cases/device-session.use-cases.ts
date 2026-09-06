import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  DEVICE_SESSION_REPOSITORY,
  DeviceSessionRepository,
} from '../../domain/device-session.repository';
import { MessageResult } from '../dto/message.result';

export interface DeviceView {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  /** True for the device the request was made from. */
  isCurrent: boolean;
}

/** Use case: list the user's active (trusted) devices, flagging the current one. */
@Injectable()
export class ListDevicesUseCase {
  constructor(
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: { userId: string; currentSessionId: string }): Promise<DeviceView[]> {
    const sessions = await this.sessions.listActiveForUser(query.userId, this.clock.now());
    return sessions.map((session) => ({
      id: session.id,
      deviceLabel: session.deviceLabel,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      isCurrent: session.id === query.currentSessionId,
    }));
  }
}

/** Use case: revoke a single device (sign it out). Scoped to the owning user. */
@Injectable()
export class RevokeDeviceUseCase {
  constructor(
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { userId: string; sessionId: string }): Promise<void> {
    const session = await this.sessions.findById(command.sessionId);
    if (session === null || session.userId !== command.userId) {
      throw new NotFoundDomainException('Device not found');
    }
    session.revoke(this.clock.now());
    await this.sessions.save(session);
  }
}

/** Use case: log out of every device by revoking all of the user's sessions. */
@Injectable()
export class LogoutAllDevicesUseCase {
  constructor(
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { userId: string }): Promise<MessageResult> {
    await this.sessions.revokeAllForUser(command.userId, this.clock.now());
    return { message: 'All devices have been signed out' };
  }
}
