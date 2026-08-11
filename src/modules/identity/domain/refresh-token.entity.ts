import { AggregateRoot } from '@shared/domain/aggregate-root.base';

interface RefreshTokenProps {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * A persisted refresh token, stored only as a hash. Persisting refresh tokens
 * lets us rotate them on use and revoke them on logout or password reset, which
 * a purely stateless scheme cannot do.
 */
export class RefreshToken extends AggregateRoot<string> {
  private props: RefreshTokenProps;

  private constructor(id: string, props: RefreshTokenProps) {
    super(id);
    this.props = props;
  }

  public static issue(params: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): RefreshToken {
    return new RefreshToken(params.id, {
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      revokedAt: null,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(id, props);
  }

  public isActive(now: Date): boolean {
    return this.props.revokedAt === null && now.getTime() < this.props.expiresAt.getTime();
  }

  public revoke(now: Date): void {
    if (this.props.revokedAt === null) {
      this.props.revokedAt = now;
    }
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get tokenHash(): string {
    return this.props.tokenHash;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
