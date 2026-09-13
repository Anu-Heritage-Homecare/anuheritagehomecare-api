/**
 * The settlement state of an invoice. PENDING awaits payment and PAID is settled.
 * Overdue ("past the due date while still pending") is derived from the due date,
 * not stored as a separate status.
 */
export enum InvoiceStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
}

/** Every valid status, used to validate incoming values at the boundary. */
export const ALL_INVOICE_STATUSES: readonly InvoiceStatus[] = Object.values(InvoiceStatus);
