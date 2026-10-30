import { Inject, Injectable } from '@nestjs/common';
import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';

export interface CreateBillingAccountCommand {
  accountName: string;
  primaryContact: string;
  phone?: string | null;
  branch?: string | null;
}

/**
 * Open a billing account from the back office. Writes a family directory entry so the
 * same account also appears on the Families screen; no app login is provisioned here.
 */
@Injectable()
export class CreateBillingAccountUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateBillingAccountCommand): Promise<{ id: string }> {
    const id = this.ids.generate();
    const entry = FamilyDirectoryEntry.registerBillingAccount({
      id,
      accountName: command.accountName,
      primaryContact: command.primaryContact,
      phone: command.phone,
      branch: command.branch,
      now: this.clock.now(),
    });
    await this.entries.save(entry);
    return { id };
  }
}
