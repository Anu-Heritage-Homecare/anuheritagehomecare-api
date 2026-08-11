import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { VerificationPurpose } from './verification-purpose.enum';

interface VerificationCodeProps {
  userId: string;
  purpose: VerificationPurpose;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: Date;
}

/**
 * A one time passcode issued for a single purpose. The passcode itself lives
 * only as a hash; this entity owns the rules that keep it safe: it expires, it
 * can be used once, and it tolerates only a limited number of wrong guesses.
 *
 * The hash comparison itself is a technical concern performed by the use case
 * through a hasher port; this entity owns the surrounding lifecycle rules.
 */
export class VerificationCode extends AggregateRoot<string> {
  private props: VerificationCodeProps;

  private constructor(id: string, props: VerificationCodeProps) {
    super(id);
    this.props = props;
  }

  public static issue(params: {
    id: string;
    userId: string;
    purpose: VerificationPurpose;
    codeHash: string;
    now: Date;
    ttlMinutes: number;
  }): VerificationCode {
    const expiresAt = new Date(params.now.getTime() + params.ttlMinutes * 60_000);
    return new VerificationCode(params.id, {
      userId: params.userId,
      purpose: params.purpose,
      codeHash: params.codeHash,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: VerificationCodeProps): VerificationCode {
    return new VerificationCode(id, props);
  }

  /**
   * Guard that the code may still be checked. Throws a validation error (never
   * revealing which specific condition failed beyond what is safe) when the code
   * is consumed, expired, or has exhausted its attempts.
   */
  public assertVerifiable(now: Date, maxAttempts: number): void {
    if (this.props.consumedAt !== null) {
      throw new ValidationException('This code has already been used');
    }
    if (now.getTime() >= this.props.expiresAt.getTime()) {
      throw new ValidationException('This code has expired');
    }
    if (this.props.attempts >= maxAttempts) {
      throw new ValidationException('Too many incorrect attempts, request a new code');
    }
  }

  public recordFailedAttempt(): void {
    this.props.attempts += 1;
  }

  public consume(now: Date): void {
    this.props.consumedAt = now;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get purpose(): VerificationPurpose {
    return this.props.purpose;
  }

  public get codeHash(): string {
    return this.props.codeHash;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get consumedAt(): Date | null {
    return this.props.consumedAt;
  }

  public get attempts(): number {
    return this.props.attempts;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
