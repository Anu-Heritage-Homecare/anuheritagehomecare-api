/**
 * Records an append only office action on a billing account that is not already
 * evidenced by an invoice, payment or care plan revision (an edit to the account
 * details, or a payment reminder the office sent). A cross cutting port so any
 * admin context can log one without depending on the admin billing module; the
 * billing account Activity Timeline and the dashboard activity read these back.
 */
export const BILLING_ACCOUNT_EVENT_RECORDER = Symbol('BILLING_ACCOUNT_EVENT_RECORDER');

export type BillingAccountEventKind = 'ACCOUNT_DETAILS_EDITED' | 'REMINDER_SENT';

export interface RecordBillingAccountEvent {
  /** The billing account (family directory entry) the action concerns. */
  familyDirectoryEntryId: string;
  kind: BillingAccountEventKind;
  /** A short human description of what happened. */
  detail?: string | null;
  /** The admin who performed it, resolved to a name on read. */
  actorAdminId?: string | null;
}

export interface BillingAccountEventRecorder {
  record(event: RecordBillingAccountEvent): Promise<void>;
}
