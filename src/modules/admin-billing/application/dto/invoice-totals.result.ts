export interface AppliedAmountResult {
  label: string;
  amountMinor: number;
}

/** The computed invoice totals breakdown (Create Invoice wizard, step 4). */
export interface InvoiceTotalsResult {
  currency: string;
  subtotalMinor: number;
  discounts: AppliedAmountResult[];
  discountTotalMinor: number;
  adjustments: AppliedAmountResult[];
  adjustmentTotalMinor: number;
  taxableBaseMinor: number;
  taxRatePercent: number;
  vatMinor: number;
  totalMinor: number;
}
