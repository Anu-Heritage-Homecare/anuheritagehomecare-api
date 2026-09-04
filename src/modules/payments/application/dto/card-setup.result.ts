import { PaymentProvider } from '../../domain/payment-provider.enum';

/**
 * The handle the client needs to finish adding a card. For Stripe it is a
 * SetupIntent client secret the app confirms with the Stripe SDK; for Paystack it
 * is a hosted page URL the user is sent to. Either way the raw card is entered at
 * the provider and never reaches this service. The reference is echoed back to the
 * confirm endpoint once the setup completes.
 */
export interface CardSetupInitiationResult {
  provider: PaymentProvider;
  reference: string;
  clientSecret: string | null;
  authorizationUrl: string | null;
}
