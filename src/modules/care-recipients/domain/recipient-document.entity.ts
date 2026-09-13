import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { DocumentCategory } from './document-category.enum';
import { DocumentStatus } from './document-status.enum';

interface RecipientDocumentProps {
  careRecipientId: string;
  name: string;
  category: DocumentCategory;
  /** Opaque object store reference; the actual upload and storage are deferred. */
  storageKey: string;
  sizeBytes: number;
  /** Who uploaded the document (free text: a caregiver, clinician, admin or HR). */
  uploadedByName: string | null;
  status: DocumentStatus;
  /** Optional expiry, for documents like certifications that lapse. */
  expiresAt: Date | null;
  uploadedAt: Date;
  updatedAt: Date;
}

const MAX_NAME_LENGTH = 300;
const MAX_KEY_LENGTH = 500;
const MAX_UPLOADER_LENGTH = 120;
const MAX_SIZE_BYTES = 5_000_000_000;

/**
 * One document held for a care recipient (a care plan, medical record, legal form,
 * insurance card, certification or photo). Stores metadata and an opaque storage
 * key; the file itself lives in object storage (upload and download are deferred,
 * consistent with the rest of the app). Sensitive personal data; never logged.
 */
export class RecipientDocument extends Entity<string> {
  private readonly props: RecipientDocumentProps;

  private constructor(id: string, props: RecipientDocumentProps) {
    super(id);
    this.props = props;
  }

  public static upload(params: {
    id: string;
    careRecipientId: string;
    name: string;
    category: DocumentCategory;
    storageKey: string;
    sizeBytes: number;
    uploadedByName?: string | null;
    status?: DocumentStatus;
    expiresAt?: Date | null;
    now: Date;
  }): RecipientDocument {
    const name = params.name.trim();
    if (name.length === 0) {
      throw new ValidationException('A document must have a name');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A document name exceeds the maximum length');
    }
    const storageKey = params.storageKey.trim();
    if (storageKey.length === 0) {
      throw new ValidationException('A document must have a storage key');
    }
    if (storageKey.length > MAX_KEY_LENGTH) {
      throw new ValidationException('A document storage key exceeds the maximum length');
    }
    if (
      !Number.isInteger(params.sizeBytes) ||
      params.sizeBytes < 0 ||
      params.sizeBytes > MAX_SIZE_BYTES
    ) {
      throw new ValidationException('A document size is out of the accepted range');
    }
    return new RecipientDocument(params.id, {
      careRecipientId: params.careRecipientId,
      name,
      category: params.category,
      storageKey,
      sizeBytes: params.sizeBytes,
      uploadedByName: RecipientDocument.cleanUploader(params.uploadedByName),
      status: params.status ?? DocumentStatus.Current,
      expiresAt: params.expiresAt ?? null,
      uploadedAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: RecipientDocumentProps): RecipientDocument {
    return new RecipientDocument(id, props);
  }

  /** Change the review status (for example mark verified or pending review). */
  public setStatus(status: DocumentStatus, now: Date): void {
    this.props.status = status;
    this.props.updatedAt = now;
  }

  private static cleanUploader(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_UPLOADER_LENGTH) {
      throw new ValidationException('A document uploader name exceeds the maximum length');
    }
    return value;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get category(): DocumentCategory {
    return this.props.category;
  }

  public get storageKey(): string {
    return this.props.storageKey;
  }

  public get sizeBytes(): number {
    return this.props.sizeBytes;
  }

  public get uploadedByName(): string | null {
    return this.props.uploadedByName;
  }

  public get status(): DocumentStatus {
    return this.props.status;
  }

  public get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  public get uploadedAt(): Date {
    return this.props.uploadedAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
