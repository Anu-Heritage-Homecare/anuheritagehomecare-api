import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { ApiKeyStatus } from './api-key-status.enum';

const MAX_NAME = 160;
const MAX_SCOPE = 80;
const MAX_SCOPES = 50;
const MIN_RATE_LIMIT = 1;
const MAX_RATE_LIMIT = 1_000_000;

/** The outcome of authenticating a presented key against a route's scope needs. */
export type ApiKeyAuthorization = 'OK' | 'REVOKED' | 'FORBIDDEN_SCOPE' | 'RATE_LIMITED';

/** The time buckets a request is counted into (hour, day, Monday of the week). */
interface UsageBuckets {
  hour: string;
  day: string;
  week: string;
}

interface ApiKeyProps {
  name: string;
  keyPrefix: string;
  last4: string;
  keyHash: string;
  scopes: string[];
  rateLimitPerHour: number;
  status: ApiKeyStatus;
  createdById: string | null;
  /** Resolved from the creator admin at read time; not persisted on the key row. */
  createdByName: string | null;
  lastUsedAt: Date | null;
  hourBucket: string | null;
  hourCount: number;
  dayBucket: string | null;
  dayCount: number;
  weekBucket: string | null;
  weekCount: number;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A programmatic API key. The raw secret lives only in the caller's hands; this
 * aggregate holds its hash, a display prefix and the last four characters, its
 * granted scopes, an hourly rate limit and rolling usage counters. Secret
 * generation and hashing happen in the application layer, which hands the derived
 * prefix, last four and hash to `create`/`regenerate`; the domain stays free of
 * crypto so it can be reasoned about and tested in isolation.
 */
export class ApiKey extends AggregateRoot<string> {
  private props: ApiKeyProps;

  private constructor(id: string, props: ApiKeyProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    name: string;
    keyPrefix: string;
    last4: string;
    keyHash: string;
    scopes: string[];
    rateLimitPerHour?: number;
    createdById: string | null;
    now: Date;
  }): ApiKey {
    return new ApiKey(params.id, {
      name: ApiKey.cleanName(params.name),
      keyPrefix: params.keyPrefix,
      last4: params.last4,
      keyHash: params.keyHash,
      scopes: ApiKey.cleanScopes(params.scopes),
      rateLimitPerHour: ApiKey.cleanRateLimit(params.rateLimitPerHour ?? 1000),
      status: ApiKeyStatus.Active,
      createdById: params.createdById,
      createdByName: null,
      lastUsedAt: null,
      hourBucket: null,
      hourCount: 0,
      dayBucket: null,
      dayCount: 0,
      weekBucket: null,
      weekCount: 0,
      revokedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: ApiKeyProps): ApiKey {
    return new ApiKey(id, props);
  }

  /** Rotate the secret (the Regenerate action). The usage history is preserved. */
  public regenerate(keyPrefix: string, last4: string, keyHash: string, now: Date): void {
    if (this.props.status !== ApiKeyStatus.Active) {
      throw new ValidationException('A revoked API key cannot be regenerated');
    }
    this.props.keyPrefix = keyPrefix;
    this.props.last4 = last4;
    this.props.keyHash = keyHash;
    this.props.updatedAt = now;
  }

  /** Permanently disable the key (the Revoke action). */
  public revoke(now: Date): void {
    if (this.props.status === ApiKeyStatus.Revoked) {
      throw new ValidationException('API key is already revoked');
    }
    this.props.status = ApiKeyStatus.Revoked;
    this.props.revokedAt = now;
    this.props.updatedAt = now;
  }

  /**
   * Authenticate a presented key for a route that requires `requiredScopes`. On a
   * granted request the usage counters advance and `lastUsedAt` is stamped (the
   * caller must persist); every rejection leaves the key untouched. Fails closed.
   */
  public authorize(requiredScopes: readonly string[], now: Date): ApiKeyAuthorization {
    if (this.props.status !== ApiKeyStatus.Active) {
      return 'REVOKED';
    }
    if (!requiredScopes.every((scope) => this.props.scopes.includes(scope))) {
      return 'FORBIDDEN_SCOPE';
    }
    const buckets = ApiKey.bucketsFor(now);
    if (
      this.props.hourBucket === buckets.hour &&
      this.props.hourCount >= this.props.rateLimitPerHour
    ) {
      return 'RATE_LIMITED';
    }
    this.recordUsage(buckets, now);
    return 'OK';
  }

  private recordUsage(buckets: UsageBuckets, now: Date): void {
    this.props.hourCount = this.props.hourBucket === buckets.hour ? this.props.hourCount + 1 : 1;
    this.props.hourBucket = buckets.hour;
    this.props.dayCount = this.props.dayBucket === buckets.day ? this.props.dayCount + 1 : 1;
    this.props.dayBucket = buckets.day;
    this.props.weekCount = this.props.weekBucket === buckets.week ? this.props.weekCount + 1 : 1;
    this.props.weekBucket = buckets.week;
    this.props.lastUsedAt = now;
    this.props.updatedAt = now;
  }

  /** Requests served so far today, or zero once the stored day bucket has rolled over. */
  public requestsToday(now: Date): number {
    return this.props.dayBucket === ApiKey.bucketsFor(now).day ? this.props.dayCount : 0;
  }

  /** Requests served so far this week, or zero once the stored week bucket has rolled over. */
  public requestsThisWeek(now: Date): number {
    return this.props.weekBucket === ApiKey.bucketsFor(now).week ? this.props.weekCount : 0;
  }

  /** The UTC hour, day and Monday of week keys a moment falls into. */
  public static bucketsFor(now: Date): UsageBuckets {
    const day = now.toISOString().slice(0, 10);
    const hour = `${day}T${now.toISOString().slice(11, 13)}`;
    const monday = new Date(now);
    const offset = (monday.getUTCDay() + 6) % 7;
    monday.setUTCDate(monday.getUTCDate() - offset);
    const week = monday.toISOString().slice(0, 10);
    return { hour, day, week };
  }

  private static cleanName(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationException('API key name is required');
    }
    if (trimmed.length > MAX_NAME) {
      throw new ValidationException('API key name exceeds the maximum length');
    }
    return trimmed;
  }

  private static cleanScopes(scopes: string[]): string[] {
    const cleaned = scopes.map((scope) => scope.trim()).filter((scope) => scope.length > 0);
    if (cleaned.some((scope) => scope.length > MAX_SCOPE)) {
      throw new ValidationException('A scope exceeds the maximum length');
    }
    if (cleaned.length > MAX_SCOPES) {
      throw new ValidationException('Too many scopes');
    }
    return [...new Set(cleaned)];
  }

  private static cleanRateLimit(value: number): number {
    if (!Number.isInteger(value) || value < MIN_RATE_LIMIT || value > MAX_RATE_LIMIT) {
      throw new ValidationException('Rate limit is out of range');
    }
    return value;
  }

  public get name(): string {
    return this.props.name;
  }

  public get keyPrefix(): string {
    return this.props.keyPrefix;
  }

  public get last4(): string {
    return this.props.last4;
  }

  public get keyHash(): string {
    return this.props.keyHash;
  }

  public get scopes(): ReadonlyArray<string> {
    return this.props.scopes;
  }

  public get rateLimitPerHour(): number {
    return this.props.rateLimitPerHour;
  }

  public get status(): ApiKeyStatus {
    return this.props.status;
  }

  public get createdById(): string | null {
    return this.props.createdById;
  }

  public get createdByName(): string | null {
    return this.props.createdByName;
  }

  public get lastUsedAt(): Date | null {
    return this.props.lastUsedAt;
  }

  public get hourBucket(): string | null {
    return this.props.hourBucket;
  }

  public get hourCount(): number {
    return this.props.hourCount;
  }

  public get dayBucket(): string | null {
    return this.props.dayBucket;
  }

  public get dayCount(): number {
    return this.props.dayCount;
  }

  public get weekBucket(): string | null {
    return this.props.weekBucket;
  }

  public get weekCount(): number {
    return this.props.weekCount;
  }

  public get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
