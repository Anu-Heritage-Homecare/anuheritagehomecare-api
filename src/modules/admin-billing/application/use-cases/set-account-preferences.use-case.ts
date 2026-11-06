import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetAccountPreferencesCommand {
  accountId: string;
  preferredPaymentMethod: string | null;
}

/** Set the office's billing preferences on a billing account (the Edit Account form). */
@Injectable()
export class SetAccountPreferencesUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetAccountPreferencesCommand): Promise<void> {
    const entry = await this.entries.findById(command.accountId);
    if (entry === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    entry.setPreferredPaymentMethod(command.preferredPaymentMethod, this.clock.now());
    await this.entries.save(entry);
  }
}
