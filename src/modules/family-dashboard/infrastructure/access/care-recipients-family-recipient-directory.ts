import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import {
  DashboardRecipientView,
  FamilyRecipientDirectory,
} from '../../application/ports/family-dashboard-directories.port';

/**
 * Adapts the care recipients context to the dashboard's recipient port. Reads the
 * owner's recipients through the exported repository and projects only what the
 * dashboard needs, keeping the care recipients domain shape out of this context.
 */
@Injectable()
export class CareRecipientsFamilyRecipientDirectory implements FamilyRecipientDirectory {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
  ) {}

  async listActiveForOwner(ownerId: string): Promise<DashboardRecipientView[]> {
    const owned = await this.recipients.listByOwner(ownerId);
    return owned
      .filter((recipient) => recipient.status === CareRecipientStatus.Active)
      .map((recipient) => ({
        id: recipient.id,
        ownerId: recipient.ownerId,
        name: recipient.profile.name,
        gender: String(recipient.profile.gender),
        dateOfBirth: recipient.profile.dateOfBirth,
        photoKey: recipient.profile.photoKey,
        medications: recipient.medications.map((medication) => ({
          id: medication.id,
          name: medication.name,
        })),
      }));
  }
}
