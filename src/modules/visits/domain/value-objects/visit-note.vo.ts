import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { NoteAudience } from '../note-audience.enum';

interface VisitNoteProps {
  authorId: string;
  audience: NoteAudience;
  text: string;
  createdAt: Date;
}

const MAX_NOTE_LENGTH = 4000;

/**
 * A single note a caregiver writes on a visit, part of the visit's append only
 * notes feed. It records who wrote it (`authorId`, resolved to a name and role by
 * the reading side), who it is for (`audience`) and when. The text is free text
 * about the recipient, so it is sensitive and must never be logged. `createdAt`
 * is stamped server side.
 */
export class VisitNote extends ValueObject<VisitNoteProps> {
  private constructor(props: VisitNoteProps) {
    super(props);
  }

  public static create(params: {
    authorId: string;
    audience: NoteAudience;
    text: string;
    createdAt: Date;
  }): VisitNote {
    if (Number.isNaN(params.createdAt.getTime())) {
      throw new ValidationException('The time a note was written is not valid');
    }
    const text = params.text.trim();
    if (text.length === 0) {
      throw new ValidationException('A note cannot be empty');
    }
    if (text.length > MAX_NOTE_LENGTH) {
      throw new ValidationException('A note exceeds the maximum length');
    }
    return new VisitNote({
      authorId: params.authorId,
      audience: params.audience,
      text,
      createdAt: params.createdAt,
    });
  }

  public get authorId(): string {
    return this.props.authorId;
  }

  public get audience(): NoteAudience {
    return this.props.audience;
  }

  public get text(): string {
    return this.props.text;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
