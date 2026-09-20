import { FamilyDirectoryEntry } from './family-directory-entry.entity';

/**
 * Persistence port for the FamilyDirectoryEntry aggregate. Declared in the domain;
 * infrastructure supplies the Prisma adapter.
 */
export interface FamilyDirectoryEntryRepository {
  save(entry: FamilyDirectoryEntry): Promise<void>;
  saveMany(entries: FamilyDirectoryEntry[]): Promise<void>;
  findById(id: string): Promise<FamilyDirectoryEntry | null>;
  findByUserId(userId: string): Promise<FamilyDirectoryEntry | null>;
  findByIds(ids: string[]): Promise<FamilyDirectoryEntry[]>;
}

export const FAMILY_DIRECTORY_ENTRY_REPOSITORY = Symbol('FAMILY_DIRECTORY_ENTRY_REPOSITORY');
