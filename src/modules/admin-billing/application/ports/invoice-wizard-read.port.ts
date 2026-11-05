/** The Account Details Preview card on step 1 of the Create Invoice wizard. */
export interface InvoiceAccountPreviewView {
  id: string;
  sequence: number;
  createdAt: Date;
  name: string;
  status: string;
  primaryContactName: string;
  primaryContactRelationship: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  outstandingBalanceMinor: number;
  currency: string | null;
  /** The most recent invoice on the account, for the "Last Invoice" line. */
  lastInvoiceSequence: number | null;
  lastInvoiceIssuedAt: Date | null;
  lastInvoiceStatus: string | null;
}

/** The Service Details Preview card on step 2 (Select Care Recipient). */
export interface RecipientServicePreviewView {
  id: string;
  name: string;
  /** The current subscription's plan name, null when the recipient has no plan. */
  carePlanModel: string | null;
  assignedCaregiverName: string | null;
  assignedCaregiverTitle: string | null;
  /** The recipient's stored care needs (raw enum values), for the billable targets. */
  careNeeds: string[];
}

/** Read model for the Create Invoice wizard's billing account selection. */
export interface InvoiceWizardReadModel {
  /** The preview of one billing account, or null when the account is unknown. */
  accountPreview(id: string): Promise<InvoiceAccountPreviewView | null>;
  /** The service preview of one care recipient, or null when it is unknown. */
  recipientServicePreview(recipientId: string): Promise<RecipientServicePreviewView | null>;
}

export const INVOICE_WIZARD_READ_MODEL = Symbol('INVOICE_WIZARD_READ_MODEL');
