import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverDocumentCategory } from './caregiver-document-category.enum';
import { CaregiverDocumentStatus } from './caregiver-document-status.enum';

const MAX_NAME_LENGTH = 200;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_KEY_LENGTH = 500;
const MAX_UPLOADER_LENGTH = 120;

interface CaregiverDocumentProps {
  caregiverId: string;
  name: string;
  category: CaregiverDocumentCategory;
  status: CaregiverDocumentStatus;
  documentDate: Date | null;
  documentKey: string | null;
  fileName: string | null;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The opaque stored file for a document, captured while blob storage is deferred. */
export interface DocumentFile {
  documentKey?: string | null;
  fileName?: string | null;
  uploadedBy?: string | null;
}

/**
 * CaregiverDocument aggregate root: one HR employment document on file for a
 * caregiver (a contract, a tax form, a signed agreement). The file itself is an
 * opaque documentKey; blob storage and signed downloads are deferred, so only the
 * metadata and key are held here.
 */
export class CaregiverDocument extends AggregateRoot<string> {
  private props: CaregiverDocumentProps;

  private constructor(id: string, props: CaregiverDocumentProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    caregiverId: string;
    name: string;
    category: CaregiverDocumentCategory;
    status?: CaregiverDocumentStatus;
    documentDate?: Date | null;
    file?: DocumentFile;
    now: Date;
  }): CaregiverDocument {
    const file = params.file ?? {};
    return new CaregiverDocument(params.id, {
      caregiverId: requireId(params.caregiverId),
      name: assertName(params.name),
      category: params.category,
      status: params.status ?? CaregiverDocumentStatus.Active,
      documentDate: params.documentDate ?? null,
      documentKey: clean(file.documentKey, MAX_KEY_LENGTH),
      fileName: clean(file.fileName, MAX_FILE_NAME_LENGTH),
      uploadedBy: clean(file.uploadedBy, MAX_UPLOADER_LENGTH),
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CaregiverDocumentProps): CaregiverDocument {
    return new CaregiverDocument(id, props);
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get category(): CaregiverDocumentCategory {
    return this.props.category;
  }

  public get status(): CaregiverDocumentStatus {
    return this.props.status;
  }

  public get documentDate(): Date | null {
    return this.props.documentDate;
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

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function requireId(value: string): string {
  const clean = value.trim();
  if (clean.length === 0) {
    throw new ValidationException('A caregiver is required for a document');
  }
  return clean;
}

function assertName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) {
    throw new ValidationException('Document name is required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationException('Document name exceeds the maximum length');
  }
  return name;
}

function clean(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, max);
}
