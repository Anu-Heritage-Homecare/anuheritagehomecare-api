import { LoginEventOutcome } from '../../domain/login-event-outcome.enum';

/** One admin login attempt, as the Security screen's history needs it. */
export interface LoginHistoryEntry {
  id: string;
  email: string;
  operatorName: string | null;
  outcome: LoginEventOutcome;
  ipAddress: string | null;
  deviceLabel: string | null;
  at: Date;
}

/** Read port over the admin login events (the Recent Login History and View All Logs). */
export interface AdminLoginHistoryReadPort {
  /** The most recent attempts, newest first, capped at `limit`. */
  recent(limit: number): Promise<LoginHistoryEntry[]>;
  /** A page of attempts, newest first, with the total count. */
  page(page: number, pageSize: number): Promise<{ entries: LoginHistoryEntry[]; total: number }>;
}

export const ADMIN_LOGIN_HISTORY_READ_PORT = Symbol('ADMIN_LOGIN_HISTORY_READ_PORT');
