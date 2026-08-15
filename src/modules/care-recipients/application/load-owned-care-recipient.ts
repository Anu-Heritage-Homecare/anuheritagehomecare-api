import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareRecipient } from '../domain/care-recipient.entity';
import { CareRecipientRepository } from '../domain/care-recipient.repository';

/**
 * Load a care recipient and assert it belongs to the given owner. A missing
 * record and a record owned by someone else are treated identically (not found),
 * so one owner can never probe another owner's data.
 */
export async function loadOwnedCareRecipient(
  repository: CareRecipientRepository,
  id: string,
  ownerId: string,
): Promise<CareRecipient> {
  const recipient = await repository.findById(id);
  if (recipient === null || recipient.ownerId !== ownerId) {
    throw new NotFoundDomainException('Care recipient not found');
  }
  return recipient;
}
