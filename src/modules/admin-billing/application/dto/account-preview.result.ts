export interface AccountPreviewContactResult {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface AccountPreviewFinancialResult {
  currency: string | null;
  outstandingMinor: number;
  totalBilledMinor: number;
  lastPaymentAt: string | null;
}

export interface AccountPreviewRecipientResult {
  name: string;
  relationship: string;
}

export interface AccountPreviewInvoiceResult {
  number: string;
  amountMinor: number;
  dueDate: string | null;
  status: string;
}

/** The Account Preview drawer: a light summary of one billing account. */
export interface AccountPreviewResult {
  id: string;
  accountName: string;
  /** ACC-<year>-<sequence>. */
  reference: string;
  status: string;
  primaryContact: AccountPreviewContactResult;
  financial: AccountPreviewFinancialResult;
  linkedRecipients: AccountPreviewRecipientResult[];
  recentInvoices: AccountPreviewInvoiceResult[];
}
