import { DeviceSession } from './device-session.entity';

/**
 * Persistence port for device sessions. A session is looked up by its current
 * refresh token hash (for rotation and single logout) or listed for a user (for
 * the Trusted Devices screen).
 */
export interface DeviceSessionRepository {
  save(session: DeviceSession): Promise<void>;
  findById(id: string): Promise<DeviceSession | null>;
  findByCurrentTokenHash(tokenHash: string): Promise<DeviceSession | null>;
  /** Active sessions for a user (not revoked, not expired), most recently used first. */
  listActiveForUser(userId: string, now: Date): Promise<DeviceSession[]>;
  countActiveForUser(userId: string, now: Date): Promise<number>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
}

export const DEVICE_SESSION_REPOSITORY = Symbol('DEVICE_SESSION_REPOSITORY');
