/**
 * Currencies the platform bills in, one per served market. Kept in the shared
 * kernel because money is a cross context concept: bookings, subscriptions and
 * payments must all agree on exactly the same currency semantics.
 */
export enum Currency {
  UnitedStatesDollar = 'USD',
  NigerianNaira = 'NGN',
}

/** The minor unit exponent per currency (both use 2 decimal places). */
export const CURRENCY_MINOR_UNIT_EXPONENT: Record<Currency, number> = {
  [Currency.UnitedStatesDollar]: 2,
  [Currency.NigerianNaira]: 2,
};

/**
 * The billing currency for a market, derived from its ISO country code. Currency
 * is decided server side from the authenticated owner's country so a client can
 * never pick a cheaper currency than their market.
 */
export function currencyForCountryCode(countryCode: string): Currency {
  switch (countryCode.trim().toUpperCase()) {
    case 'US':
      return Currency.UnitedStatesDollar;
    case 'NG':
      return Currency.NigerianNaira;
    default:
      throw new Error(`No billing currency configured for country ${countryCode}`);
  }
}
