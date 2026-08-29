import { PayableType } from '../../domain/payable-type.enum';
import { PayableSummary } from '../ports/payable-service.port';

/**
 * Command to start paying for a booking or subscription. `ownerId` and
 * `ownerEmail` come from the authenticated principal; the amount and currency are
 * read from the payable itself, never from the client.
 *
 * `resolvedPayable` lets another context that already owns the payable (for
 * example billing paying an invoice) pass its server side resolved summary, so
 * payments does not have to depend on that context. It is never set from a client
 * request; when absent the payable service resolves the payable.
 */
export interface InitiatePaymentCommand {
  ownerId: string;
  ownerEmail: string;
  payableType: PayableType;
  payableId: string;
  resolvedPayable?: PayableSummary;
}
