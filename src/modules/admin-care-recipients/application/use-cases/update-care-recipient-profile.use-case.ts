import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { RecipientProfile } from '@modules/care-recipients/domain/value-objects/recipient-profile.vo';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface UpdateCareRecipientProfileCommand {
  recipientId: string;
  name: string;
  gender: string;
  dateOfBirth: Date;
  city: string;
  state: string;
  fullAddress: string;
  relationship: string;
  livingSituation: string;
  photoKey?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Use case: revise a care recipient's identity profile (who they are and where
 * they live) from the admin Edit screen. The profile value object revalidates
 * every field; an unknown recipient is rejected and a discharged one is refused
 * by the aggregate.
 */
@Injectable()
export class UpdateCareRecipientProfileUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateCareRecipientProfileCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const profile = RecipientProfile.create({
      name: command.name,
      gender: command.gender,
      dateOfBirth: command.dateOfBirth,
      city: command.city,
      state: command.state,
      fullAddress: command.fullAddress,
      relationship: command.relationship,
      livingSituation: command.livingSituation,
      photoKey: command.photoKey ?? null,
      latitude: command.latitude ?? null,
      longitude: command.longitude ?? null,
    });

    recipient.reviseProfile(profile, this.clock.now());
    await this.recipients.save(recipient);
    return { id: recipient.id };
  }
}
