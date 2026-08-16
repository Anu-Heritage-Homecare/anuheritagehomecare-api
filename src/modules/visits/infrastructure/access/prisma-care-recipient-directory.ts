import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  CareRecipientDirectory,
  RecipientSnapshot,
} from '../../application/ports/care-recipient-directory.port';

/**
 * Adapter satisfying the visits CareRecipientDirectory port by delegating to the
 * care recipients repository in one batched query. Projects the aggregate into
 * the flat snapshot the schedule needs, keeping the visits application layer
 * decoupled from that context's domain shape.
 */
@Injectable()
export class PrismaCareRecipientDirectory implements CareRecipientDirectory {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly recipients: CareRecipientRepository,
  ) {}

  async lookup(ids: string[]): Promise<Map<string, RecipientSnapshot>> {
    const found = await this.recipients.findByIds(ids);
    const snapshots = new Map<string, RecipientSnapshot>();

    for (const recipient of found) {
      const health = recipient.health;
      snapshots.set(recipient.id, {
        id: recipient.id,
        ownerId: recipient.ownerId,
        name: recipient.profile.name,
        gender: recipient.profile.gender,
        dateOfBirth: recipient.profile.dateOfBirth,
        fullAddress: recipient.profile.fullAddress,
        careNeeds: recipient.careNeeds,
        medicalConditions: health?.medicalConditions ?? [],
        allergies: health?.allergies ?? [],
        photoKey: recipient.profile.photoKey,
        latitude: recipient.profile.location?.latitude ?? null,
        longitude: recipient.profile.location?.longitude ?? null,
      });
    }

    return snapshots;
  }
}
