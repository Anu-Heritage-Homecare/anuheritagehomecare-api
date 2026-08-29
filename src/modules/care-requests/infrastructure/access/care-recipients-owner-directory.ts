import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipientOwnerDirectory } from '../../application/ports/care-recipient-owner-directory.port';

/**
 * Resolves the owner of a care recipient through the care recipients context's
 * exported repository, so care requests never depend on that domain shape.
 */
@Injectable()
export class CareRecipientsOwnerDirectory implements CareRecipientOwnerDirectory {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
  ) {}

  async ownerOf(careRecipientId: string): Promise<string | null> {
    const recipient = await this.recipients.findById(careRecipientId);
    return recipient === null ? null : recipient.ownerId;
  }
}
