/** The customer payment avenues configured on the Billing Settings screen. */
export enum BillingPaymentMethodKind {
  BankTransfer = 'BANK_TRANSFER',
  Card = 'CARD',
  Cash = 'CASH',
  MobileMoney = 'MOBILE_MONEY',
}

export const ALL_BILLING_PAYMENT_METHOD_KINDS: BillingPaymentMethodKind[] =
  Object.values(BillingPaymentMethodKind);

/** The out of the box description for each avenue, used until an admin edits it. */
export const DEFAULT_PAYMENT_METHOD_DESCRIPTION: Record<BillingPaymentMethodKind, string> = {
  [BillingPaymentMethodKind.BankTransfer]: 'Manual confirmation of transfers',
  [BillingPaymentMethodKind.Card]: 'Paystack integration active',
  [BillingPaymentMethodKind.Cash]: 'Record physical cash at office',
  [BillingPaymentMethodKind.MobileMoney]: 'Automated instant confirmation',
};
