import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipientStatus } from '@modules/care-recipients/domain/care-recipient-status.enum';
import { CareRecipientAccess } from '../../application/ports/care-recipient-access.port';

/**
 * Adapter that satisfies the bookings CareRecipientAccess port by delegating to
 * the care recipients context repository. Keeps the bookings application layer
 * decoupled from that context's domain shape.
 */
@Injectable()
export class PrismaCareRecipientAccess implements CareRecipientAccess {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly recipients: CareRecipientRepository,
  ) {}

  async assertBookable(ownerId: string, careRecipientId: string): Promise<void> {
    const recipient = await this.recipients.findById(careRecipientId);
    if (recipient === null || recipient.ownerId !== ownerId) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    if (recipient.status !== CareRecipientStatus.Active) {
      throw new ValidationException('Finish the care recipient onboarding before booking care');
    }
  }
}
