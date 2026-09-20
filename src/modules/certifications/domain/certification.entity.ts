import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

const MAX_NAME_LENGTH = 120;
const MS_PER_DAY = 86_400_000;

interface CertificationProps {
  caregiverId: string;
  name: string;
  licenseNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface CertificationDetails {
  name: string;
  licenseNumber?: string | null;
  issuedAt?: Date | null;
  expiresAt: Date;
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
    licenseNumber?: string | null;
    issuedAt?: Date | null;
    expiresAt: Date;
    now: Date;
  }): Certification {
    return new Certification(params.id, {
      caregiverId: params.caregiverId,
      name: assertName(params.name),
      licenseNumber: cleanLicence(params.licenseNumber),
      issuedAt: params.issuedAt ?? null,
      expiresAt: assertExpiry(params.expiresAt),
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CertificationProps): Certification {
    return new Certification(id, props);
  }

  /** Update the editable fields of a certification. */
  public revise(details: CertificationDetails): void {
    this.props.name = assertName(details.name);
    if (details.licenseNumber !== undefined) {
      this.props.licenseNumber = cleanLicence(details.licenseNumber);
    }
    if (details.issuedAt !== undefined) {
      this.props.issuedAt = details.issuedAt;
    }
    this.props.expiresAt = assertExpiry(details.expiresAt);
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

  public get licenseNumber(): string | null {
    return this.props.licenseNumber;
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

function assertName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) {
    throw new ValidationException('Certification name is required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationException('Certification name exceeds the maximum length');
  }
  return name;
}

function assertExpiry(value: Date): Date {
  if (Number.isNaN(value.getTime())) {
    throw new ValidationException('The expiry date is not valid');
  }
  return value;
}

function cleanLicence(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new ValidationException('The licence number exceeds the maximum length');
  }
  return trimmed;
}
