import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface NoteCommentProps {
  noteId: string;
  authorName: string;
  /** The commenter's role (free text, for example "Care Coordinator"), or null. */
  authorRole: string | null;
  content: string;
  createdAt: Date;
}

const MAX_CONTENT_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;

/**
 * One comment appended to a care note (a supervisor or colleague reply). A child of
 * the CareNote aggregate, append only; feeds the comment count on the note card.
 * Sensitive personal data; never logged.
 */
export class NoteComment extends Entity<string> {
  private readonly props: NoteCommentProps;

  private constructor(id: string, props: NoteCommentProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    noteId: string;
    authorName: string;
    authorRole?: string | null;
    content: string;
    now: Date;
  }): NoteComment {
    const authorName = params.authorName.trim();
    if (authorName.length === 0) {
      throw new ValidationException('A comment must have an author');
    }
    if (authorName.length > MAX_NAME_LENGTH) {
      throw new ValidationException('A comment author name exceeds the maximum length');
    }
    const content = params.content.trim();
    if (content.length === 0) {
      throw new ValidationException('A comment must have content');
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new ValidationException('A comment exceeds the maximum length');
    }
    return new NoteComment(params.id, {
      noteId: params.noteId,
      authorName,
      authorRole: NoteComment.cleanRole(params.authorRole),
      content,
      createdAt: params.now,
    });
  }

  public static rehydrate(id: string, props: NoteCommentProps): NoteComment {
    return new NoteComment(id, props);
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
      throw new ValidationException('A comment author role exceeds the maximum length');
    }
    return value;
  }

  public get noteId(): string {
    return this.props.noteId;
  }

  public get authorName(): string {
    return this.props.authorName;
  }

  public get authorRole(): string | null {
    return this.props.authorRole;
  }

  public get content(): string {
    return this.props.content;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
