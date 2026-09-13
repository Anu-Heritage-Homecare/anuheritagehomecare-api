import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { NoteCategory } from './note-category.enum';

interface CareNoteProps {
  careRecipientId: string;
  category: NoteCategory;
  content: string;
  /** Who wrote the note (free text, for example "Sarah Williams"). */
  authorName: string;
  /** The author's role (free text, for example "CNA", "Family"), or null. */
  authorRole: string | null;
  /** Opaque object store references for attachments; storage is deferred. */
  attachmentKeys: string[];
  flaggedForReview: boolean;
  acknowledgedAt: Date | null;
  acknowledgedByAdminId: string | null;
  /** The admin who entered the note, for attribution. Null for app authored notes. */
  authorAdminId: string | null;
  /** When the note was logged (may predate createdAt for a backfilled entry). */
  postedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_CONTENT_LENGTH = 4000;
const MAX_NAME_LENGTH = 120;
const MAX_ATTACHMENTS = 20;
const MAX_KEY_LENGTH = 500;

/**
 * One care note on a recipient's activity log. Authored by whoever logged it (a
 * caregiver, coordinator or family member), categorised, and optionally flagged for
 * urgent supervisor attention. A supervisor acknowledges a note once reviewed. The
 * aggregate root owns its comments. Sensitive personal data; must never be logged.
 */
export class CareNote extends AggregateRoot<string> {
  private readonly props: CareNoteProps;

  private constructor(id: string, props: CareNoteProps) {
    super(id);
    this.props = props;
  }

  public static post(params: {
    id: string;
    careRecipientId: string;
    category: NoteCategory;
    content: string;
    authorName: string;
    authorRole?: string | null;
    attachmentKeys?: string[] | null;
    flaggedForReview?: boolean;
    authorAdminId?: string | null;
    postedAt?: Date | null;
    now: Date;
  }): CareNote {
    const content = params.content.trim();
    if (content.length === 0) {
      throw new ValidationException('A note must have content');
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new ValidationException('A note exceeds the maximum length');
    }
    const authorName = params.authorName.trim();
    if (authorName.length === 0) {
      throw new ValidationException('A note must have an author');
    }
    if (authorName.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A note author name exceeds the maximum length');
    }
    const postedAt = params.postedAt ?? params.now;
    if (Number.isNaN(postedAt.getTime())) {
      throw new ValidationException('The note date is not valid');
    }
    return new CareNote(params.id, {
      careRecipientId: params.careRecipientId,
      category: params.category,
      content,
      authorName,
      authorRole: CareNote.cleanRole(params.authorRole),
      attachmentKeys: CareNote.cleanAttachments(params.attachmentKeys),
      flaggedForReview: params.flaggedForReview ?? false,
      acknowledgedAt: null,
      acknowledgedByAdminId: null,
      authorAdminId: params.authorAdminId ?? null,
      postedAt,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CareNoteProps): CareNote {
    return new CareNote(id, { ...props, attachmentKeys: [...props.attachmentKeys] });
  }

  /** Record that a supervisor reviewed the note. The first acknowledgement stands. */
  public acknowledge(adminId: string, now: Date): void {
    if (this.props.acknowledgedAt !== null) {
      return;
    }
    this.props.acknowledgedAt = now;
    this.props.acknowledgedByAdminId = adminId;
    this.props.updatedAt = now;
  }

  /** Flag or clear the note for urgent supervisor attention. */
  public setFlagged(flagged: boolean, now: Date): void {
    this.props.flaggedForReview = flagged;
    this.props.updatedAt = now;
  }

  private static cleanRole(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = raw.trim();
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A note author role exceeds the maximum length');
    }
    return value;
  }

  private static cleanAttachments(raw: string[] | null | undefined): string[] {
    if (raw === null || raw === undefined) {
      return [];
    }
    if (raw.length > MAX_ATTACHMENTS) {
      throw new ValidationException('A note has too many attachments');
    }
    return raw.map((key) => {
      const value = key.trim();
      if (value.length === 0) {
        throw new ValidationException('A note attachment key must not be empty');
      }
      if (value.length > MAX_KEY_LENGTH) {
        throw new ValidationException('A note attachment key exceeds the maximum length');
      }
      return value;
    });
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get category(): NoteCategory {
    return this.props.category;
  }

  public get content(): string {
    return this.props.content;
  }

  public get authorName(): string {
    return this.props.authorName;
  }

  public get authorRole(): string | null {
    return this.props.authorRole;
  }

  public get attachmentKeys(): string[] {
    return [...this.props.attachmentKeys];
  }

  public get flaggedForReview(): boolean {
    return this.props.flaggedForReview;
  }

  public get acknowledgedAt(): Date | null {
    return this.props.acknowledgedAt;
  }

  public get acknowledgedByAdminId(): string | null {
    return this.props.acknowledgedByAdminId;
  }

  public get authorAdminId(): string | null {
    return this.props.authorAdminId;
  }

  public get postedAt(): Date {
    return this.props.postedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
