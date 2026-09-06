import { Entity } from '@shared/domain/entity.base';

export enum LoginOutcome {
  Success = 'SUCCESS',
  Failure = 'FAILURE',
}

interface LoginEventProps {
  userId: string;
  outcome: LoginOutcome;
  deviceLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * An attributable login attempt (success or failure) for a known account, written
 * to the audit log the Login Activity screen reads. Only attempts we can tie to a
 * user are recorded; a login for an unknown email is not, to avoid an unbounded
 * log of arbitrary addresses.
 */
export class LoginEvent extends Entity<string> {
  private readonly props: LoginEventProps;

  private constructor(id: string, props: LoginEventProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    userId: string;
    outcome: LoginOutcome;
    deviceLabel: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    now: Date;
  }): LoginEvent {
    return new LoginEvent(params.id, {
      userId: params.userId,
      outcome: params.outcome,
      deviceLabel: params.deviceLabel,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: LoginEventProps): LoginEvent {
    return new LoginEvent(id, props);
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get outcome(): LoginOutcome {
    return this.props.outcome;
  }

  public get deviceLabel(): string | null {
    return this.props.deviceLabel;
  }

  public get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  public get userAgent(): string | null {
    return this.props.userAgent;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
