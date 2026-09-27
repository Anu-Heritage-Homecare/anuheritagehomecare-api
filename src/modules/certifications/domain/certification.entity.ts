import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CredentialKind } from './credential-kind.enum';

const MAX_NAME_LENGTH = 120;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_KEY_LENGTH = 500;
const MAX_UPLOADER_LENGTH = 120;
const MS_PER_DAY = 86_400_000;

interface CertificationProps {
  caregiverId: string;
  name: string;
  kind: CredentialKind;
  licenseNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date;
  documentKey: string | null;
  fileName: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

/** The opaque stored file for a credential, captured while blob storage is deferred. */
export interface CredentialDocument {
  documentKey?: string | null;
  fileName?: string | null;
  uploadedBy?: string | null;
}

export interface CertificationDetails {
  name: string;
  kind?: CredentialKind;
  licenseNumber?: string | null;
  issuedAt?: Date | null;
  expiresAt: Date;
  document?: CredentialDocument;
}

/**
 * Certification aggregate root: a caregiver's credential with an expiry (for
 * example a CPR certificate). The operations dashboard watches these to raise a
 * Certification Expiring alert as the expiry approaches, and the caregiver
 * Documents tab lists them with a status derived from the kind and expiry. The
 * attached file is an opaque documentKey; blob storage and signed downloads are
 * deferred.
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
    kind?: CredentialKind;
    licenseNumber?: string | null;
    issuedAt?: Date | null;
    expiresAt: Date;
    document?: CredentialDocument;
    now: Date;
  }): Certification {
    const document = params.document ?? {};
    return new Certification(params.id, {
      caregiverId: params.caregiverId,
      name: assertName(params.name),
      kind: params.kind ?? CredentialKind.Certification,
      licenseNumber: cleanLicence(params.licenseNumber),
      issuedAt: params.issuedAt ?? null,
      expiresAt: assertExpiry(params.expiresAt),
      documentKey: clean(document.documentKey, MAX_KEY_LENGTH),
      fileName: clean(document.fileName, MAX_FILE_NAME_LENGTH),
      uploadedBy: clean(document.uploadedBy, MAX_UPLOADER_LENGTH),
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CertificationProps): Certification {
    return new Certification(id, props);
  }

  /** Update the editable fields of a certification. */
  public revise(details: CertificationDetails): void {
    this.props.name = assertName(details.name);
    if (details.kind !== undefined) {
      this.props.kind = details.kind;
    }
    if (details.licenseNumber !== undefined) {
      this.props.licenseNumber = cleanLicence(details.licenseNumber);
    }
    if (details.issuedAt !== undefined) {
      this.props.issuedAt = details.issuedAt;
    }
    this.props.expiresAt = assertExpiry(details.expiresAt);
    if (details.document !== undefined) {
      const document = details.document;
      if (document.documentKey !== undefined) {
        this.props.documentKey = clean(document.documentKey, MAX_KEY_LENGTH);
      }
      if (document.fileName !== undefined) {
        this.props.fileName = clean(document.fileName, MAX_FILE_NAME_LENGTH);
      }
      if (document.uploadedBy !== undefined) {
        this.props.uploadedBy = clean(document.uploadedBy, MAX_UPLOADER_LENGTH);
      }
    }
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

  public get kind(): CredentialKind {
    return this.props.kind;
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

  public get documentKey(): string | null {
    return this.props.documentKey;
  }

  public get fileName(): string | null {
    return this.props.fileName;
  }

  public get uploadedBy(): string | null {
    return this.props.uploadedBy;
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

function clean(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, max);
}
