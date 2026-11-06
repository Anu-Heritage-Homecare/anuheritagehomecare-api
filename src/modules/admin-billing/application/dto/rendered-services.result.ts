/** One billable service with the quantity pre filled from the recipient's care logs. */
export interface RenderedServiceResult {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: 'HOURLY' | 'SESSION' | 'FIXED';
  rateMinor: number | null;
  /** Quantity derived from the recipient's completed visits in the period. */
  suggestedQuantity: number;
  /** How many completed visits fed this line (0 for the flat coordination fee). */
  sourceVisitCount: number;
  /** rateMinor * suggestedQuantity; 0 when the service is not priced for the market. */
  amountMinor: number;
}

/**
 * The Select Billable Services step: the catalog for the market with each service's
 * quantity pre filled from the recipient's rendered care over the billing period.
 */
export interface RenderedServicesResult {
  currency: string;
  periodStart: string;
  periodEnd: string;
  /** The standard tax rate from billing settings, as whole percent. */
  taxRatePercent: number;
  services: RenderedServiceResult[];
}
