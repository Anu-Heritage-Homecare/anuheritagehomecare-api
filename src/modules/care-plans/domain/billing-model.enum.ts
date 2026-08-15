/**
 * How a plan is billed. Flexible is paid per booking by the hour; the other
 * three are recurring monthly subscriptions.
 */
export enum BillingModel {
  Hourly = 'HOURLY',
  Monthly = 'MONTHLY',
}
