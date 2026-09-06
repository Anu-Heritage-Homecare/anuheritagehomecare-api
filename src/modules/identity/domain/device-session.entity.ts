import { AggregateRoot } from '@shared/domain/aggregate-root.base';

interface DeviceSessionProps {
  userId: string;
  /** A human label for the device, for example "iPhone 15" or "Chrome on macOS". */
  deviceLabel: string;
  ipAddress: string | null;
  userAgent: string | null;
  /** SHA-256 hash of the current refresh token; rotated in place on every refresh. */
  currentTokenHash: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
}

/**
 * A signed in device (a session). It is the stable server side record behind a
 * rotating refresh token: the refresh token hash lives here and is rotated in
 * place on every refresh, so the session keeps a single identity across the life
 * of the device even as its token changes. This is what the Trusted Devices
 * screen lists and what "log out of all devices" revokes. Persisting sessions is
 * what lets us rotate, list and revoke them, which a stateless scheme cannot.
 */
export class DeviceSession extends AggregateRoot<string> {
  private props: DeviceSessionProps;

  private constructor(id: string, props: DeviceSessionProps) {
    super(id);
    this.props = props;
  }

  /** Open a new session for a device. The token hash is set when tokens are issued. */
  public static start(params: {
    id: string;
    userId: string;
    deviceLabel: string;
    ipAddress: string | null;
    userAgent: string | null;
    now: Date;
  }): DeviceSession {
    return new DeviceSession(params.id, {
      userId: params.userId,
      deviceLabel: params.deviceLabel,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      currentTokenHash: null,
      expiresAt: null,
      createdAt: params.now,
      lastUsedAt: params.now,
      revokedAt: null,
    });
  }

  public static rehydrate(id: string, props: DeviceSessionProps): DeviceSession {
    return new DeviceSession(id, props);
  }

  /**
   * Bind (or rotate to) a fresh refresh token. Called both when the session is
   * first issued tokens and on every refresh, which stamps the new hash and moves
   * the last used marker forward.
   */
  public rotateToken(tokenHash: string, expiresAt: Date, now: Date): void {
    this.props.currentTokenHash = tokenHash;
    this.props.expiresAt = expiresAt;
    this.props.lastUsedAt = now;
  }

  /** A session can mint new tokens while it is not revoked and not expired. */
  public isActive(now: Date): boolean {
    return (
      this.props.revokedAt === null &&
      this.props.expiresAt !== null &&
      now.getTime() < this.props.expiresAt.getTime()
    );
  }

  public revoke(now: Date): void {
    if (this.props.revokedAt === null) {
      this.props.revokedAt = now;
    }
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get deviceLabel(): string {
    return this.props.deviceLabel;
  }

  public get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  public get userAgent(): string | null {
    return this.props.userAgent;
  }

  public get currentTokenHash(): string | null {
    return this.props.currentTokenHash;
  }

  public get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get lastUsedAt(): Date {
    return this.props.lastUsedAt;
  }

  public get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
}
