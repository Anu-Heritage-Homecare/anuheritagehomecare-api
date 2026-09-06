import { Entity } from '@shared/domain/entity.base';

export enum CareCodeStatus {
  Active = 'ACTIVE',
  Revoked = 'REVOKED',
}

/** How long a freshly issued care code stays redeemable. */
export const CARE_CODE_TTL_DAYS = 7;

interface CareCodeProps {
  ownerId: string;
  /** The human readable code shared with the invitee, for example CARE-7319-KLM2. */
  code: string;
  status: CareCodeStatus;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * A care code: a short lived bearer credential an owner shares so a family member
 * or friend can join their care circle. It is not addressed to a specific person,
 * so whoever holds it can redeem it while it is active and unexpired (hence the
 * seven day life and the "keep it private" guidance). A redeemed code is not
 * consumed: it stays reusable within its window so one code can admit several
 * relatives. Every joiner lands at the least privileged access level; the owner
 * grants real permissions afterwards. Owned by the profile context.
 */
export class CareCode extends Entity<string> {
  private readonly props: CareCodeProps;

  private constructor(id: string, props: CareCodeProps) {
    super(id);
    this.props = props;
  }

  public static issue(params: { id: string; ownerId: string; code: string; now: Date }): CareCode {
    const expiresAt = new Date(params.now.getTime() + CARE_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);
    return new CareCode(params.id, {
      ownerId: params.ownerId,
      code: params.code,
      status: CareCodeStatus.Active,
      createdAt: params.now,
      expiresAt,
    });
  }

  public static rehydrate(id: string, props: CareCodeProps): CareCode {
    return new CareCode(id, props);
  }

  /** A code can be redeemed while it is active and has not expired. */
  public isRedeemable(now: Date): boolean {
    return this.props.status === CareCodeStatus.Active && now < this.props.expiresAt;
  }

  /** Retire the code so it can no longer be redeemed. */
  public revoke(): void {
    this.props.status = CareCodeStatus.Revoked;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get code(): string {
    return this.props.code;
  }

  public get status(): CareCodeStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }
}
