import { Currency } from '@shared/domain/currency.enum';

/**
 * Command to create a Flexible (hourly) booking. `ownerId` and `currency` are
 * supplied by the presentation layer from the authenticated principal, never by
 * the client, so pricing currency cannot be tampered with.
 */
export interface CreateFlexibleBookingCommand {
  ownerId: string;
  currency: Currency;
  careRecipientId: string;
  hours: number;
  serviceDate: string;
  startTime: string;
}
