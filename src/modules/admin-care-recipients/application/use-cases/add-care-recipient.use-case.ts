import { Inject, Injectable } from '@nestjs/common';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { RecipientProfile } from '@modules/care-recipients/domain/value-objects/recipient-profile.vo';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';

export interface AddCareRecipientCommand {
  /** The family owner the recipient belongs to. */
  ownerId: string;
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
  priority?: CareRecipientPriority;
}

/**
 * Use case: an admin provisions a care recipient directly from the back office,
 * bypassing the family owner wizard. The owner must be an existing family account.
 * The record is created active with its identity profile; the care plan is added
 * later (until then it surfaces under the Missing Care Plan trigger).
 */
@Injectable()
export class AddCareRecipientUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddCareRecipientCommand): Promise<{ id: string }> {
    const owner = await this.users.findById(command.ownerId);
    if (owner === null || owner.userType !== UserType.FamilyMember) {
      throw new ValidationException('The owner must be an existing family account');
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

    const recipient = CareRecipient.provisionByAdmin({
      id: this.ids.generate(),
      ownerId: command.ownerId,
      profile,
      priority: command.priority,
      now: this.clock.now(),
    });
    await this.recipients.save(recipient);
    return { id: recipient.id };
  }
}
