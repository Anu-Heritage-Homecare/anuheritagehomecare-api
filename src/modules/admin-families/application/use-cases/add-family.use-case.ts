import { Inject, Injectable } from '@nestjs/common';
import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';

export interface FamilyContactInput {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
  primaryRecipientId?: string | null;
}

/**
 * Add a family member to the directory as a contact entry (captured details, no app
 * account). Provisioning an actual login account is deferred to the identity admin
 * surface, so Add Family records a contact-kind directory entry.
 */
@Injectable()
export class AddFamilyUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: FamilyContactInput): Promise<{ id: string }> {
    const id = this.ids.generate();
    const entry = FamilyDirectoryEntry.registerContact({ id, now: this.clock.now(), ...input });
    await this.entries.save(entry);
    return { id };
  }
}

/** Bulk import family members as contact entries. */
@Injectable()
export class ImportFamiliesUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(inputs: FamilyContactInput[]): Promise<{ created: number }> {
    const now = this.clock.now();
    const entries = inputs.map((input) =>
      FamilyDirectoryEntry.registerContact({ id: this.ids.generate(), now, ...input }),
    );
    await this.entries.saveMany(entries);
    return { created: entries.length };
  }
}
