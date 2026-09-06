import { AdminSession } from './admin-session.entity';

/**
 * Persistence port for admin sessions. A session is looked up by its current
 * refresh token hash (for rotation and single logout) and all of an admin's
 * sessions can be revoked at once (on a password change).
 */
export interface AdminSessionRepository {
  save(session: AdminSession): Promise<void>;
  findByCurrentTokenHash(tokenHash: string): Promise<AdminSession | null>;
  revokeAllForAdmin(adminUserId: string, now: Date): Promise<void>;
}

export const ADMIN_SESSION_REPOSITORY = Symbol('ADMIN_SESSION_REPOSITORY');
