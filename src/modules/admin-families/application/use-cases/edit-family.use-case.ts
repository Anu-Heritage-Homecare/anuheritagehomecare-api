import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { FamilyMemberStatus } from '@modules/family-directory/domain/family-member-status.enum';
import {
  BILLING_ACCOUNT_EVENT_RECORDER,
  BillingAccountEventRecorder,
} from '@shared/application/ports/billing-account-event-recorder.port';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export type EditFamilyCommand = { entryId: string; adminId?: string } & (
  | { section: 'NOTES'; quickNotes: string | null }
  | { section: 'STATUS'; status: FamilyMemberStatus }
  | { section: 'EMERGENCY_VERIFIED'; verified: boolean }
  | { section: 'PRIMARY_RECIPIENT'; recipientId: string | null }
  | {
      section: 'CONTACT_DETAILS';
      fields: {
        fullName?: string;
        phone?: string | null;
        email?: string | null;
        relationship?: string | null;
      };
    }
);

/** A human description of the edit, for the billing account Activity Timeline. */
const EDIT_DETAIL: Record<EditFamilyCommand['section'], string> = {
  NOTES: 'Account notes updated',
  STATUS: 'Account status updated',
  EMERGENCY_VERIFIED: 'Emergency contact verification updated',
  PRIMARY_RECIPIENT: 'Primary recipient updated',
  CONTACT_DETAILS: 'Contact details updated',
};

/** Edit one section of a family directory entry and log it to the account timeline. */
@Injectable()
export class EditFamilyUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly entries: FamilyDirectoryEntryRepository,
    @Inject(BILLING_ACCOUNT_EVENT_RECORDER)
    private readonly events: BillingAccountEventRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EditFamilyCommand): Promise<void> {
    const entry = await this.entries.findById(command.entryId);
    if (entry === null) {
      throw new NotFoundDomainException('Family member not found');
    }
    const now = this.clock.now();

    switch (command.section) {
      case 'NOTES':
        entry.setQuickNotes(command.quickNotes, now);
        break;
      case 'STATUS':
        entry.setStatus(command.status, now);
        break;
      case 'EMERGENCY_VERIFIED':
        entry.setEmergencyContactVerified(command.verified, now);
        break;
      case 'PRIMARY_RECIPIENT':
        entry.linkPrimaryRecipient(command.recipientId, now);
        break;
      case 'CONTACT_DETAILS':
        entry.reviseContactDetails(command.fields, now);
        break;
    }

    await this.entries.save(entry);

    await this.events.record({
      familyDirectoryEntryId: command.entryId,
      kind: 'ACCOUNT_DETAILS_EDITED',
      detail: EDIT_DETAIL[command.section],
      actorAdminId: command.adminId ?? null,
    });
  }
}
