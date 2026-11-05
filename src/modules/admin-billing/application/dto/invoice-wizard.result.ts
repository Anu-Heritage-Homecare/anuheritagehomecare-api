/** The Account Details Preview returned for step 1 of the Create Invoice wizard. */
export interface InvoiceAccountPreviewResult {
  id: string;
  /** Human friendly account reference, ACC-<year>-<sequence>. */
  accountNumber: string;
  name: string;
  status: string;
  primaryContactName: string;
  primaryContactRelationship: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  outstandingBalanceMinor: number;
  currency: string | null;
  /** The last invoice reference, INV-<year>-<sequence>, or null when none. */
  lastInvoiceNumber: string | null;
  lastInvoiceStatus: string | null;
}

/** The Service Details Preview returned for step 2 of the Create Invoice wizard. */
export interface RecipientServicePreviewResult {
  id: string;
  name: string;
  carePlanModel: string | null;
  assignedCaregiverName: string | null;
  assignedCaregiverTitle: string | null;
  /** The recipient's care needs as display labels (the Key Billable Targets). */
  keyBillableTargets: string[];
}
