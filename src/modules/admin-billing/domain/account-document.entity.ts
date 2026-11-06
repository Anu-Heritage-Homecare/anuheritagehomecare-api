import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface AccountDocumentProps {
  familyDirectoryEntryId: string;
  title: string;
  fileName: string;
  storageKey: string;
  sizeBytes: number;
  uploadedByAdminId: string | null;
  uploadedAt: Date;
}

const MAX_TITLE = 200;
const MAX_FILENAME = 300;
const MAX_KEY = 500;

/** One file attached to a billing account (the account Documents tab). */
export class AccountDocument extends AggregateRoot<string> {
  private readonly props: AccountDocumentProps;

  private constructor(id: string, props: AccountDocumentProps) {
    super(id);
    this.props = props;
  }

  public static register(params: {
    id: string;
    familyDirectoryEntryId: string;
    title: string;
    fileName: string;
    storageKey: string;
    sizeBytes: number;
    uploadedByAdminId?: string | null;
    now: Date;
  }): AccountDocument {
    const title = text(params.title, MAX_TITLE, 'A document title is required');
    const fileName = text(params.fileName, MAX_FILENAME, 'A file name is required');
    const storageKey = text(params.storageKey, MAX_KEY, 'A storage key is required');
    if (!Number.isInteger(params.sizeBytes) || params.sizeBytes <= 0) {
      throw new ValidationException('The document size must be a positive whole number of bytes');
    }
    return new AccountDocument(params.id, {
      familyDirectoryEntryId: params.familyDirectoryEntryId,
      title,
      fileName,
      storageKey,
      sizeBytes: params.sizeBytes,
      uploadedByAdminId: params.uploadedByAdminId ?? null,
      uploadedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: AccountDocumentProps): AccountDocument {
    return new AccountDocument(id, props);
  }

  public get familyDirectoryEntryId(): string {
    return this.props.familyDirectoryEntryId;
  }
  public get title(): string {
    return this.props.title;
  }
  public get fileName(): string {
    return this.props.fileName;
  }
  public get storageKey(): string {
    return this.props.storageKey;
  }
  public get sizeBytes(): number {
    return this.props.sizeBytes;
  }
  public get uploadedByAdminId(): string | null {
    return this.props.uploadedByAdminId;
  }
  public get uploadedAt(): Date {
    return this.props.uploadedAt;
  }
}

function text(raw: string, max: number, message: string): string {
  const value = raw.trim();
  if (value.length === 0) {
    throw new ValidationException(message);
  }
  if (value.length > max) {
    throw new ValidationException('A document field exceeds the maximum length');
  }
  return value;
}
