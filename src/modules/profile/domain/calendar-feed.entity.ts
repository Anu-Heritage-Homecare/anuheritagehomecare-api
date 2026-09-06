import { Entity } from '@shared/domain/entity.base';

interface CalendarFeedProps {
  /** The opaque, unguessable token embedded in the feed URL (a bearer capability). */
  token: string;
  createdAt: Date;
}

/**
 * A family owner's private calendar feed. The token in the feed URL is the only
 * credential a calendar app can present (it cannot send a bearer header), so it
 * is a long random secret and the feed is read only. One per owner, keyed by the
 * user id; regenerating it rotates the token and invalidates the old URL.
 */
export class CalendarFeed extends Entity<string> {
  private props: CalendarFeedProps;

  private constructor(userId: string, props: CalendarFeedProps) {
    super(userId);
    this.props = props;
  }

  public static issue(params: { userId: string; token: string; now: Date }): CalendarFeed {
    return new CalendarFeed(params.userId, { token: params.token, createdAt: params.now });
  }

  public static rehydrate(userId: string, props: CalendarFeedProps): CalendarFeed {
    return new CalendarFeed(userId, props);
  }

  /** Rotate to a fresh token, invalidating the previous feed URL. */
  public regenerate(token: string, now: Date): void {
    this.props.token = token;
    this.props.createdAt = now;
  }

  public get userId(): string {
    return this.id;
  }

  public get token(): string {
    return this.props.token;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
