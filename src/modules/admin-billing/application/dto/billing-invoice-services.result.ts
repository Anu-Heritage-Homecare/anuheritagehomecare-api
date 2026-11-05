/** One service line on the Services tab. Money is minor units. */
export interface BillingInvoiceServiceResult {
  serviceName: string;
  category: string | null;
  hoursUnits: number | null;
  unit: string | null;
  rateMinor: number | null;
  amountMinor: number;
  assignedCaregiver: string | null;
}

export interface BillingInvoiceServicesResult {
  currency: string;
  servicePeriodStart: string;
  servicePeriodEnd: string;
  services: BillingInvoiceServiceResult[];
  /** Count of distinct service names ("6 Distinct Services Listed"). */
  distinctCount: number;
  summaryAmountMinor: number;
}
