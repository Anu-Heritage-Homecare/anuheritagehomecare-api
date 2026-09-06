import { LoginEvent } from './login-event.entity';

/** Persistence port for the login audit log. */
export interface LoginEventRepository {
  save(event: LoginEvent): Promise<void>;
  /** The most recent events for a user, newest first, capped to a limit. */
  listRecentForUser(userId: string, limit: number): Promise<LoginEvent[]>;
}

export const LOGIN_EVENT_REPOSITORY = Symbol('LOGIN_EVENT_REPOSITORY');
