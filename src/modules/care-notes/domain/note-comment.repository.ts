import { NoteComment } from './note-comment.entity';

/**
 * Persistence port for note comments (append only write side). The per note comment
 * counts for the admin screen are computed by the notes read model, not here.
 */
export interface NoteCommentRepository {
  add(comment: NoteComment): Promise<void>;
}

export const NOTE_COMMENT_REPOSITORY = Symbol('NOTE_COMMENT_REPOSITORY');
