import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';

export interface SetPrimaryCaregiverCommand {
  recipientId: string;
  /** The caregiver to assign, or null to clear the assignment. */
  caregiverId: string | null;
}

/**
 * Use case: assign, reassign or clear the office set primary caregiver for a care
 * recipient. A provided caregiver must be a real caregiver account.
 */
@Injectable()
export class SetPrimaryCaregiverUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    command: SetPrimaryCaregiverCommand,
  ): Promise<{ id: string; primaryCaregiverId: string | null }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    if (command.caregiverId === null) {
      recipient.unassignPrimaryCaregiver(now);
    } else {
      const caregiver = await this.users.findById(command.caregiverId);
      if (caregiver === null || caregiver.userType !== UserType.Caregiver) {
        throw new ValidationException('The assigned user is not a caregiver');
      }
      recipient.assignPrimaryCaregiver(command.caregiverId, now);
    }

    await this.recipients.save(recipient);
    return { id: recipient.id, primaryCaregiverId: recipient.primaryCaregiverId };
  }
}
