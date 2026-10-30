import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { NoteAudience } from '../note-audience.enum';
import { VisitNoteReply } from './visit-note-reply.vo';
import { VisitNoteSource } from './visit-note-source.enum';

interface VisitNoteProps {
  id: string;
  source: VisitNoteSource;
  authorId: string | null;
  authorAdminId: string | null;
  authorName: string | null;
  authorRole: string | null;
  audience: NoteAudience;
  text: string;
  acknowledgedAt: Date | null;
  acknowledgedByName: string | null;
  flaggedForCoordinator: boolean;
  flaggedAt: Date | null;
  editedAt: Date | null;
  replies: VisitNoteReply[];
  createdAt: Date;
}

const MAX_NOTE_LENGTH = 4000;

/**
 * A note on a visit's notes feed. Authored by a caregiver during the shift
 * (`source` CAREGIVER, `authorId` a mobile user resolved to a name and role on the
 * read side), an office coordinator (`source` COORDINATOR, `authorAdminId`, with the
 * name and role snapshotted) or the system. A coordinator can acknowledge a note
 * (reviewed), flag it for attention, edit a coordinator note's text, and reply.
 * Immutable: each change returns a new value object. The text is sensitive and must
 * never be logged.
 */
export class VisitNote extends ValueObject<VisitNoteProps> {
  private constructor(props: VisitNoteProps) {
    super(props);
  }

  /** A caregiver's note written during the shift; the author resolves on the read side. */
  public static createCaregiverNote(params: {
    id: string;
    authorId: string;
    audience: NoteAudience;
    text: string;
    createdAt: Date;
  }): VisitNote {
    return VisitNote.of({
      id: params.id,
      source: VisitNoteSource.Caregiver,
      authorId: params.authorId,
      authorAdminId: null,
      authorName: null,
      authorRole: null,
      audience: params.audience,
      text: params.text,
      createdAt: params.createdAt,
    });
  }

  /** An office coordinator's note; the author name and role are snapshotted. */
  public static createCoordinatorNote(params: {
    id: string;
    authorAdminId: string;
    authorName: string;
    authorRole: string;
    text: string;
    createdAt: Date;
  }): VisitNote {
    return VisitNote.of({
      id: params.id,
      source: VisitNoteSource.Coordinator,
      authorId: null,
      authorAdminId: params.authorAdminId,
      authorName: params.authorName,
      authorRole: params.authorRole,
      audience: NoteAudience.CareTeam,
      text: params.text,
      createdAt: params.createdAt,
    });
  }

  /** Reconstitute a note from persistence (full state, no validation of history). */
  public static rehydrate(props: VisitNoteProps): VisitNote {
    return new VisitNote(props);
  }

  private static of(params: {
    id: string;
    source: VisitNoteSource;
    authorId: string | null;
    authorAdminId: string | null;
    authorName: string | null;
    authorRole: string | null;
    audience: NoteAudience;
    text: string;
    createdAt: Date;
  }): VisitNote {
    if (Number.isNaN(params.createdAt.getTime())) {
      throw new ValidationException('The time a note was written is not valid');
    }
    return new VisitNote({
      ...params,
      text: VisitNote.cleanText(params.text),
      acknowledgedAt: null,
      acknowledgedByName: null,
      flaggedForCoordinator: false,
      flaggedAt: null,
      editedAt: null,
      replies: [],
    });
  }

  private static cleanText(raw: string): string {
    const text = raw.trim();
    if (text.length === 0) {
      throw new ValidationException('A note cannot be empty');
    }
    if (text.length > MAX_NOTE_LENGTH) {
      throw new ValidationException('A note exceeds the maximum length');
    }
    return text;
  }

  /** A coordinator reviewed the note; records who and when (idempotent). */
  public acknowledge(byName: string, now: Date): VisitNote {
    if (this.props.acknowledgedAt !== null) {
      return this;
    }
    return new VisitNote({
      ...this.props,
      acknowledgedAt: now,
      acknowledgedByName: byName.trim(),
    });
  }

  /** Flag the note for coordinator attention (idempotent). */
  public flagForCoordinator(now: Date): VisitNote {
    if (this.props.flaggedForCoordinator) {
      return this;
    }
    return new VisitNote({ ...this.props, flaggedForCoordinator: true, flaggedAt: now });
  }

  /** Edit the note's text, stamping the edit time. Only coordinator notes are editable. */
  public edit(text: string, now: Date): VisitNote {
    if (this.props.source !== VisitNoteSource.Coordinator) {
      throw new ValidationException('Only a coordinator note can be edited');
    }
    return new VisitNote({ ...this.props, text: VisitNote.cleanText(text), editedAt: now });
  }

  /** Append a reply to the note. */
  public reply(reply: VisitNoteReply): VisitNote {
    return new VisitNote({ ...this.props, replies: [...this.props.replies, reply] });
  }

  public get id(): string {
    return this.props.id;
  }

  public get source(): VisitNoteSource {
    return this.props.source;
  }

  public get authorId(): string | null {
    return this.props.authorId;
  }

  public get authorAdminId(): string | null {
    return this.props.authorAdminId;
  }

  public get authorName(): string | null {
    return this.props.authorName;
  }

  public get authorRole(): string | null {
    return this.props.authorRole;
  }

  public get audience(): NoteAudience {
    return this.props.audience;
  }

  public get text(): string {
    return this.props.text;
  }

  public get acknowledgedAt(): Date | null {
    return this.props.acknowledgedAt;
  }

  public get acknowledgedByName(): string | null {
    return this.props.acknowledgedByName;
  }

  public get flaggedForCoordinator(): boolean {
    return this.props.flaggedForCoordinator;
  }

  public get flaggedAt(): Date | null {
    return this.props.flaggedAt;
  }

  public get editedAt(): Date | null {
    return this.props.editedAt;
  }

  public get replies(): VisitNoteReply[] {
    return [...this.props.replies];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
