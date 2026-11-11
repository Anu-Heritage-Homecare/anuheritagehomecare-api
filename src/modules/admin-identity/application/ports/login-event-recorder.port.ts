/**
 * Records an admin authentication attempt (success or failure) for the Security
 * screen's login history. A distinct port from session storage: it captures failed
 * attempts too, including for unknown emails, which never open a session.
 */
export interface LoginEventRecord {
  adminUserId: string | null;
  email: string;
  operatorName: string | null;
  outcome: 'SUCCESS' | 'FAILED';
  ipAddress: string | null;
  deviceLabel: string | null;
}

export interface LoginEventRecorder {
  record(event: LoginEventRecord): Promise<void>;
}

export const LOGIN_EVENT_RECORDER = Symbol('LOGIN_EVENT_RECORDER');
