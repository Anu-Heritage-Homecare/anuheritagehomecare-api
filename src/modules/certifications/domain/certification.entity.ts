import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

const MAX_NAME_LENGTH = 120;
const MS_PER_DAY = 86_400_000;

interface CertificationProps {
  caregiverId: string;
  name: string;
  issuedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Certification aggregate root: a caregiver's credential with an expiry (for
 * example a CPR certificate). The operations dashboard watches these to raise a
 * Certification Expiring alert as the expiry approaches. The management surface
 * (the Caregivers screen) is built later; this models the data and its expiry
 * arithmetic.
 */
export class Certification extends AggregateRoot<string> {
  private props: CertificationProps;

  private constructor(id: string, props: CertificationProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    caregiverId: string;
    name: string;
    issuedAt?: Date | null;
    expiresAt: Date;
    now: Date;
  }): Certification {
    const name = params.name.trim();
    if (name.length === 0) {
      throw new ValidationException('Certification name is required');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationException('Certification name exceeds the maximum length');
    }
    if (Number.isNaN(params.expiresAt.getTime())) {
      throw new ValidationException('The expiry date is not valid');
    }
    return new Certification(params.id, {
      caregiverId: params.caregiverId,
      name,
      issuedAt: params.issuedAt ?? null,
      expiresAt: params.expiresAt,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CertificationProps): Certification {
    return new Certification(id, props);
  }

  /** Whole days from `now` until expiry; negative once expired. */
  public daysUntilExpiry(now: Date): number {
    return Math.floor((this.props.expiresAt.getTime() - now.getTime()) / MS_PER_DAY);
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get issuedAt(): Date | null {
    return this.props.issuedAt;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
