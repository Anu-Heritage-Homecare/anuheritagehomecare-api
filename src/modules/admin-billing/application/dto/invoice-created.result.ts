/** The invoice raised by the Create Invoice wizard (step 5). */
export interface InvoiceCreatedResult {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxMinor: number;
  taxRatePercent: number;
  totalMinor: number;
}
