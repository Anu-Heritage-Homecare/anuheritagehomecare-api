export type PaymentEventType = 'INITIATED' | 'CONFIRMED' | 'RECEIPT_GENERATED' | 'REFUNDED';
export type PaymentEventActor = 'SYSTEM' | 'ADMIN';

export interface RecordPaymentEvent {
  paymentId: string;
  type: PaymentEventType;
  /** When the event occurred (INITIATED uses the received time, the rest use now). */
  at: Date;
  actorType: PaymentEventActor;
  /** The admin who did it (ADMIN), resolved to a name on read. */
  actorAdminId?: string | null;
  /** A display label for a SYSTEM actor (e.g. the method, or "System"). */
  actorLabel?: string | null;
  detail?: string | null;
}

/** Appends entries to a payment's lifecycle audit log (the Payment Details history). */
export interface PaymentEventRecorder {
  record(events: RecordPaymentEvent[]): Promise<void>;
}

export const PAYMENT_EVENT_RECORDER = Symbol('PAYMENT_EVENT_RECORDER');
