import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface InvoiceAttachmentProps {
  invoiceId: string;
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

/** One file attached to an invoice (the invoice Attachments tab). */
export class InvoiceAttachment extends AggregateRoot<string> {
  private readonly props: InvoiceAttachmentProps;

  private constructor(id: string, props: InvoiceAttachmentProps) {
    super(id);
    this.props = props;
  }

  public static register(params: {
    id: string;
    invoiceId: string;
    title: string;
    fileName: string;
    storageKey: string;
    sizeBytes: number;
    uploadedByAdminId?: string | null;
    now: Date;
  }): InvoiceAttachment {
    const title = text(params.title, MAX_TITLE, 'An attachment title is required');
    const fileName = text(params.fileName, MAX_FILENAME, 'A file name is required');
    const storageKey = text(params.storageKey, MAX_KEY, 'A storage key is required');
    if (!Number.isInteger(params.sizeBytes) || params.sizeBytes <= 0) {
      throw new ValidationException('The attachment size must be a positive whole number of bytes');
    }
    return new InvoiceAttachment(params.id, {
      invoiceId: params.invoiceId,
      title,
      fileName,
      storageKey,
      sizeBytes: params.sizeBytes,
      uploadedByAdminId: params.uploadedByAdminId ?? null,
      uploadedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: InvoiceAttachmentProps): InvoiceAttachment {
    return new InvoiceAttachment(id, props);
  }

  public get invoiceId(): string {
    return this.props.invoiceId;
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
    throw new ValidationException('An attachment field exceeds the maximum length');
  }
  return value;
}
