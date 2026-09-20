import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { FamilyMemberStatus } from '@modules/family-directory/domain/family-member-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';

interface BulkEditFamiliesCommand {
  ids: string[];
  status: FamilyMemberStatus;
}

export interface BulkEditFamiliesResult {
  updated: number;
  notFound: string[];
}

/**
 * Bulk edit the status of a selection of family directory entries. Ids that do not
 * resolve are reported back rather than failing the whole batch.
 */
@Injectable()
export class BulkEditFamiliesUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: BulkEditFamiliesCommand): Promise<BulkEditFamiliesResult> {
    const now = this.clock.now();
    const uniqueIds = [...new Set(command.ids)];
    const found = await this.entries.findByIds(uniqueIds);
    const foundIds = new Set(found.map((entry) => entry.id));

    for (const entry of found) {
      entry.setStatus(command.status, now);
      await this.entries.save(entry);
    }

    return {
      updated: found.length,
      notFound: uniqueIds.filter((id) => !foundIds.has(id)),
    };
  }
}
