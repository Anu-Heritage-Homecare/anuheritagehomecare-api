/** Identity verification providers, one per market. */
export enum KycProvider {
  Stripe = 'STRIPE',
  QoreId = 'QOREID',
}

/** Choose the provider for a country: Stripe for the US, QoreID for Nigeria. */
export function kycProviderForCountry(countryCode: string): KycProvider {
  switch (countryCode.trim().toUpperCase()) {
    case 'US':
      return KycProvider.Stripe;
    case 'NG':
      return KycProvider.QoreId;
    default:
      throw new Error(`No KYC provider configured for country ${countryCode}`);
  }
}
