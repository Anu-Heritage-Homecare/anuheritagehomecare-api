import { Inject, Injectable } from '@nestjs/common';
import { LOGIN_EVENT_REPOSITORY, LoginEventRepository } from '../../domain/login-event.repository';

export interface LoginActivityView {
  at: string;
  outcome: string;
  deviceLabel: string | null;
  ipAddress: string | null;
}

/** How many recent login events the activity screen shows. */
const RECENT_LIMIT = 20;

/** Use case: the authenticated user's recent login activity, newest first. */
@Injectable()
export class GetLoginActivityUseCase {
  constructor(@Inject(LOGIN_EVENT_REPOSITORY) private readonly events: LoginEventRepository) {}

  async execute(query: { userId: string }): Promise<LoginActivityView[]> {
    const events = await this.events.listRecentForUser(query.userId, RECENT_LIMIT);
    return events.map((event) => ({
      at: event.createdAt.toISOString(),
      outcome: event.outcome,
      deviceLabel: event.deviceLabel,
      ipAddress: event.ipAddress,
    }));
  }
}
