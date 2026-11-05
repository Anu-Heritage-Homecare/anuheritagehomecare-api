import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { InvoiceNoteCategory } from './invoice-note-category.enum';

interface InvoiceNoteProps {
  invoiceId: string;
  authorId: string;
  category: InvoiceNoteCategory;
  body: string;
  createdAt: Date;
}

const MAX_BODY = 2000;

/** An internal note on an invoice, authored by an admin and classified by category. */
export class InvoiceNote extends AggregateRoot<string> {
  private props: InvoiceNoteProps;

  private constructor(id: string, props: InvoiceNoteProps) {
    super(id);
    this.props = props;
  }

  static create(params: {
    id: string;
    invoiceId: string;
    authorId: string;
    category: InvoiceNoteCategory;
    body: string;
    now: Date;
  }): InvoiceNote {
    const body = params.body.trim();
    if (body.length === 0) {
      throw new ValidationException('A note body is required');
    }
    if (body.length > MAX_BODY) {
      throw new ValidationException(`A note body cannot exceed ${MAX_BODY} characters`);
    }
    return new InvoiceNote(params.id, {
      invoiceId: params.invoiceId,
      authorId: params.authorId,
      category: params.category,
      body,
      createdAt: params.now,
    });
  }

  /** Rehydrate an entity from storage without re-running creation invariants. */
  static fromPersistence(id: string, props: InvoiceNoteProps): InvoiceNote {
    return new InvoiceNote(id, props);
  }

  get invoiceId(): string {
    return this.props.invoiceId;
  }

  get authorId(): string {
    return this.props.authorId;
  }

  get category(): InvoiceNoteCategory {
    return this.props.category;
  }

  get body(): string {
    return this.props.body;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
