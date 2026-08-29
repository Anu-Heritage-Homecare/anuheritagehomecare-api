/** Lifecycle of an invoice. Paid once a successful payment settles it. */
export enum InvoiceStatus {
  Issued = 'ISSUED',
  Paid = 'PAID',
  Void = 'VOID',
}
