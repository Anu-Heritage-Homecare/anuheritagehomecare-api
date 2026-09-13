import { CareNote } from './care-note.entity';

/**
 * Persistence port for care notes (write side). The paginated, filtered reads and the
 * aggregate counts for the admin screen live in a dedicated read model, not here.
 */
export interface CareNoteRepository {
  add(note: CareNote): Promise<void>;
  save(note: CareNote): Promise<void>;
  findById(id: string): Promise<CareNote | null>;
}

export const CARE_NOTE_REPOSITORY = Symbol('CARE_NOTE_REPOSITORY');
