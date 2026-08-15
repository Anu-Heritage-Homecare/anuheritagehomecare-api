import { Currency } from '@shared/domain/currency.enum';
import { PayableType } from '../../domain/payable-type.enum';

export interface PayableRecurring {
  /** The Stripe recurring price id and Paystack plan code for the owner currency. */
  stripePriceId: string | null;
  paystackPlanCode: string | null;
}

export interface PayableSummary {
  ownerId: string;
  currency: Currency;
  amountMinor: number;
  /** True once the payable has already been paid for (confirmed or active). */
  alreadyPaid: boolean;
  /** Present for monthly subscriptions, null for one time bookings. */
  recurring: PayableRecurring | null;
}

/**
 * Port the payments context uses to read what is being paid for and to mark it
 * paid, without depending on the bookings domain directly. The adapter lives in
 * infrastructure and delegates to the bookings and subscriptions repositories.
 */
export interface PayableService {
  load(payableType: PayableType, payableId: string): Promise<PayableSummary | null>;
  markPaid(payableType: PayableType, payableId: string): Promise<void>;
}

export const PAYABLE_SERVICE = Symbol('PAYABLE_SERVICE');
