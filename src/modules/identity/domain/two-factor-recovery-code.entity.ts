import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface TwoFactorRecoveryCodeProps {
  userId: string;
  codeHash: string;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * A single use backup code a user can present instead of their authenticator
 * when they cannot generate a TOTP code. Only the hash is ever stored, and a code
 * can be consumed exactly once. A fresh set is issued when two factor is enabled
 * and replaces any earlier set.
 */
export class TwoFactorRecoveryCode extends AggregateRoot<string> {
  private props: TwoFactorRecoveryCodeProps;

  private constructor(id: string, props: TwoFactorRecoveryCodeProps) {
    super(id);
    this.props = props;
  }

  public static issue(params: {
    id: string;
    userId: string;
    codeHash: string;
    now: Date;
  }): TwoFactorRecoveryCode {
    return new TwoFactorRecoveryCode(params.id, {
      userId: params.userId,
      codeHash: params.codeHash,
      usedAt: null,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: TwoFactorRecoveryCodeProps): TwoFactorRecoveryCode {
    return new TwoFactorRecoveryCode(id, props);
  }

  public get isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  /** Consume the code, so it can never be used again. */
  public consume(now: Date): void {
    if (this.props.usedAt !== null) {
      throw new ValidationException('This recovery code has already been used');
    }
    this.props.usedAt = now;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get codeHash(): string {
    return this.props.codeHash;
  }

  public get usedAt(): Date | null {
    return this.props.usedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
