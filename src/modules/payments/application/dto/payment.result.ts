import { Currency } from '@shared/domain/currency.enum';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';

/** Outcome of initiating a payment: what the client needs to complete it. */
export interface PaymentInitiationResult {
  paymentId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  currency: Currency;
  amountMinor: number;
  /** Stripe: confirm the PaymentIntent with this client secret. */
  clientSecret: string | null;
  /** Paystack: redirect the user to this hosted checkout URL. */
  authorizationUrl: string | null;
}
