import { Currency } from '@shared/domain/currency.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';

/**
 * Command to create a Flexible (hourly) booking. `ownerId` and `currency` are
 * supplied by the presentation layer from the authenticated principal, never by
 * the client, so pricing currency cannot be tampered with. `planType` is the plan
 * the user selected; the use case validates it is an hourly plan and prices from
 * it, so the booking reflects exactly what was chosen.
 */
export interface CreateFlexibleBookingCommand {
  ownerId: string;
  currency: Currency;
  planType: CarePlanType;
  careRecipientId: string;
  hours: number;
  serviceDate: string;
  startTime: string;
}
