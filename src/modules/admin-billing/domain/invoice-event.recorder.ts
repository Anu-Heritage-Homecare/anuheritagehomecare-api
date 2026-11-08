export type InvoiceEventType =
  'CREATED' | 'APPROVED' | 'SENT' | 'VIEWED' | 'REMINDER_SENT' | 'CANCELLED';
export type InvoiceEventActor = 'ADMIN' | 'SYSTEM' | 'CLIENT';

export interface RecordInvoiceEvent {
  invoiceId: string;
  type: InvoiceEventType;
  /** A short human description for the timeline. */
  detail?: string | null;
  actorType: InvoiceEventActor;
  /** The admin who did it (ADMIN), resolved to a name on read. */
  actorAdminId?: string | null;
  /** A display label for a SYSTEM or CLIENT actor. */
  actorLabel?: string | null;
}

/** Appends entries to an invoice's lifecycle audit log (the History tab). */
export interface InvoiceEventRecorder {
  record(event: RecordInvoiceEvent): Promise<void>;
}

export const INVOICE_EVENT_RECORDER = Symbol('INVOICE_EVENT_RECORDER');
