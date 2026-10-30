import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VisitNoteReplyProps {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: Date;
}

const MAX_TEXT_LENGTH = 4000;

/**
 * A reply on a visit note. Append only; the author name and role are snapshotted at
 * write time. The text is free text about the recipient, so it is sensitive and must
 * never be logged.
 */
export class VisitNoteReply extends ValueObject<VisitNoteReplyProps> {
  private constructor(props: VisitNoteReplyProps) {
    super(props);
  }

  public static create(params: {
    id: string;
    authorName: string;
    authorRole: string;
    text: string;
    createdAt: Date;
  }): VisitNoteReply {
    const text = params.text.trim();
    if (text.length === 0) {
      throw new ValidationException('A reply cannot be empty');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new ValidationException('A reply exceeds the maximum length');
    }
    return new VisitNoteReply({
      id: params.id,
      authorName: params.authorName.trim(),
      authorRole: params.authorRole.trim(),
      text,
      createdAt: params.createdAt,
    });
  }

  public get id(): string {
    return this.props.id;
  }

  public get authorName(): string {
    return this.props.authorName;
  }

  public get authorRole(): string {
    return this.props.authorRole;
  }

  public get text(): string {
    return this.props.text;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
