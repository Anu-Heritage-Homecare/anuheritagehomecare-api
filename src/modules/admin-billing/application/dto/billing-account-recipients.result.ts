/** One care recipient billed under an account. Money is minor units. */
export interface BillingAccountRecipientResult {
  id: string;
  name: string;
  photoKey: string | null;
  relationship: string;
  servicePlan: string | null;
  monthlyCostMinor: number | null;
  currency: string | null;
  startDate: string | null;
  status: string;
}

export interface BillingAccountRecipientsResult {
  recipients: BillingAccountRecipientResult[];
  total: number;
}
