import { ValidationException } from '@shared/domain/domain-exception';

export type DiscountKind = 'PERCENT' | 'FIXED';

/** One billable line: a rate in minor units multiplied by a quantity (hours, sessions, 1). */
export interface InvoiceLineInput {
  rateMinor: number;
  quantity: number;
}

/** A discount: a percentage of the subtotal, or a fixed reduction in minor units. */
export interface InvoiceDiscountInput {
  label: string;
  kind: DiscountKind;
  value: number;
}

/** A manual adjustment: a signed amount in minor units (a surcharge or a reduction). */
export interface InvoiceAdjustmentInput {
  label: string;
  amountMinor: number;
}

/** A resolved money line in the breakdown. */
export interface AppliedAmount {
  label: string;
  amountMinor: number;
}

export interface InvoiceTotals {
  subtotalMinor: number;
  discounts: AppliedAmount[];
  discountTotalMinor: number;
  adjustments: AppliedAmount[];
  adjustmentTotalMinor: number;
  /** Subtotal less discounts plus manual adjustments; never negative. VAT applies to this. */
  taxableBaseMinor: number;
  taxRateBasisPoints: number;
  vatMinor: number;
  totalMinor: number;
}

const MAX_TAX_BASIS_POINTS = 10_000; // 100%
const MAX_LABEL = 120;

/**
 * Compute an invoice's totals from its lines, discounts, manual adjustments and tax rate.
 * All money is integer minor units. Discounts reduce the subtotal; manual adjustments then
 * modify the base (a surcharge or a reduction); VAT is charged on the resulting base. The
 * base is clamped at zero so a discount can never produce negative tax. This is the single
 * authoritative money calculation; the client never computes the amount that will be charged.
 */
export function computeInvoiceTotals(params: {
  lines: InvoiceLineInput[];
  discounts: InvoiceDiscountInput[];
  adjustments: InvoiceAdjustmentInput[];
  taxRateBasisPoints: number;
}): InvoiceTotals {
  if (
    !Number.isInteger(params.taxRateBasisPoints) ||
    params.taxRateBasisPoints < 0 ||
    params.taxRateBasisPoints > MAX_TAX_BASIS_POINTS
  ) {
    throw new ValidationException('The tax rate must be between 0 and 100 percent');
  }

  const subtotalMinor = params.lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const discounts = params.discounts.map((discount) => ({
    label: requireLabel(discount.label, 'discount'),
    amountMinor: discountAmount(discount, subtotalMinor),
  }));
  const discountTotalMinor = discounts.reduce((sum, d) => sum + d.amountMinor, 0);

  const adjustments = params.adjustments.map((adjustment) => ({
    label: requireLabel(adjustment.label, 'adjustment'),
    amountMinor: requireInteger(adjustment.amountMinor, 'A manual adjustment amount'),
  }));
  const adjustmentTotalMinor = adjustments.reduce((sum, a) => sum + a.amountMinor, 0);

  const taxableBaseMinor = Math.max(0, subtotalMinor - discountTotalMinor + adjustmentTotalMinor);
  const vatMinor = Math.round((taxableBaseMinor * params.taxRateBasisPoints) / 10_000);

  return {
    subtotalMinor,
    discounts,
    discountTotalMinor,
    adjustments,
    adjustmentTotalMinor,
    taxableBaseMinor,
    taxRateBasisPoints: params.taxRateBasisPoints,
    vatMinor,
    totalMinor: taxableBaseMinor + vatMinor,
  };
}

function lineTotal(line: InvoiceLineInput): number {
  if (!Number.isInteger(line.rateMinor) || line.rateMinor < 0) {
    throw new ValidationException('A line rate must be a non negative integer of minor units');
  }
  if (!Number.isFinite(line.quantity) || line.quantity < 0) {
    throw new ValidationException('A line quantity must be a non negative number');
  }
  return Math.round(line.rateMinor * line.quantity);
}

function discountAmount(discount: InvoiceDiscountInput, subtotalMinor: number): number {
  if (discount.kind === 'PERCENT') {
    if (!Number.isFinite(discount.value) || discount.value < 0 || discount.value > 100) {
      throw new ValidationException('A percentage discount must be between 0 and 100');
    }
    return Math.round((subtotalMinor * discount.value) / 100);
  }
  return requireInteger(discount.value, 'A fixed discount amount', true);
}

function requireLabel(label: string, what: string): string {
  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LABEL) {
    throw new ValidationException(`A ${what} label must be 1 to ${MAX_LABEL} characters`);
  }
  return trimmed;
}

function requireInteger(value: number, what: string, nonNegative = false): number {
  if (!Number.isInteger(value) || (nonNegative && value < 0)) {
    throw new ValidationException(`${what} must be a whole number of minor units`);
  }
  return value;
}
