import { Currency } from '@shared/domain/currency.enum';

export interface NewInvoiceLine {
  serviceName: string;
  amountMinor: number;
  position: number;
  rateMinor: number;
  quantity: number;
  unitLabel: string;
  /** Snapshotted service category (from the catalog). */
  category: string | null;
  /** The dates this line's service was rendered, and who delivered it. */
  serviceDateStart: Date | null;
  serviceDateEnd: Date | null;
  caregiverId: string | null;
}

export interface NewInvoiceAdjustmentRow {
  kind: 'DISCOUNT' | 'ADJUSTMENT';
  label: string;
  /** Signed minor units: a discount is negative, a manual adjustment keeps its sign. */
  amountMinor: number;
  position: number;
}

/** A fully computed invoice ready to persist (header, service lines and adjustments). */
export interface NewInvoice {
  careRecipientId: string;
  periodStart: Date;
  periodEnd: Date;
  servicesLabel: string;
  currency: Currency;
  amountMinor: number;
  insuranceCoveredMinor: number;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxMinor: number;
  taxRateBasisPoints: number;
  issuedAt: Date;
  dueDate: Date;
  lines: NewInvoiceLine[];
  adjustments: NewInvoiceAdjustmentRow[];
}

/** Persistence port for raising a recipient invoice (Create Invoice wizard). */
export interface InvoiceWriteRepository {
  recipientExists(careRecipientId: string): Promise<boolean>;
  /** Persist the invoice with its lines and adjustments; returns the id and sequence. */
  create(invoice: NewInvoice): Promise<{ id: string; sequence: number }>;
}

export const INVOICE_WRITE_REPOSITORY = Symbol('INVOICE_WRITE_REPOSITORY');
