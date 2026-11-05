export interface BillableServiceResult {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: 'HOURLY' | 'SESSION' | 'FIXED';
  rateMinor: number | null;
}

/** The billable services catalog for one currency, with the tax rate to apply. */
export interface BillableServicesResult {
  currency: string;
  /** The standard tax rate from billing settings, as whole percent. */
  taxRatePercent: number;
  services: BillableServiceResult[];
}
