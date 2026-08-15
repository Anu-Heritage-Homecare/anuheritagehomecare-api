import { PayableType } from '../../domain/payable-type.enum';

/**
 * Command to start paying for a booking or subscription. `ownerId` and
 * `ownerEmail` come from the authenticated principal; the amount and currency are
 * read from the payable itself, never from the client.
 */
export interface InitiatePaymentCommand {
  ownerId: string;
  ownerEmail: string;
  payableType: PayableType;
  payableId: string;
}
