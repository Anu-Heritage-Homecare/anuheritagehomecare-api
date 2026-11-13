/** The Send Payment Reminder modal preview: the facts and the composed message. */
export interface InvoiceReminderPreviewResult {
  invoiceNumber: string;
  amountDueMinor: number;
  currency: string;
  daysOverdue: number;
  subject: string;
  body: string;
}
