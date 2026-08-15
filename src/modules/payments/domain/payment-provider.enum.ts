import { Currency } from '@shared/domain/currency.enum';

/** The payment providers, one per market. */
export enum PaymentProvider {
  Stripe = 'STRIPE',
  Paystack = 'PAYSTACK',
}

/** Choose the provider for a currency: Stripe for USD, Paystack for NGN. */
export function providerForCurrency(currency: Currency): PaymentProvider {
  switch (currency) {
    case Currency.UnitedStatesDollar:
      return PaymentProvider.Stripe;
    case Currency.NigerianNaira:
      return PaymentProvider.Paystack;
    default:
      throw new Error(`No payment provider configured for currency ${String(currency)}`);
  }
}
