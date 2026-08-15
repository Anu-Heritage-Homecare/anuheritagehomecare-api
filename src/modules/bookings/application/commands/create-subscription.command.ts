import { Currency } from '@shared/domain/currency.enum';

/** Command to subscribe a care recipient to a monthly plan. */
export interface CreateSubscriptionCommand {
  ownerId: string;
  currency: Currency;
  careRecipientId: string;
  planType: string;
  startDate: string;
}
