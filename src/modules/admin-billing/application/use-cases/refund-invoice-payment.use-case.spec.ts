import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  InvoicePaymentWriteRepository,
  RefundablePayment,
} from '../../domain/invoice-payment-write.repository';
import { RecordPaymentEvent } from '../../domain/payment-event.recorder';
import { RefundInvoicePaymentUseCase } from './refund-invoice-payment.use-case';

const NOW = new Date('2026-11-06T10:00:00.000Z');
const clock = { now: () => NOW };

function recorder(): {
  record: (events: RecordPaymentEvent[]) => Promise<void>;
  events: RecordPaymentEvent[];
} {
  const events: RecordPaymentEvent[] = [];
  return {
    events,
    record: (batch) => {
      events.push(...batch);
      return Promise.resolve();
    },
  };
}

function repo(
  payment: RefundablePayment | null,
): InvoicePaymentWriteRepository & { refunded: string[] } {
  const refunded: string[] = [];
  return {
    refunded,
    loadForPayment: () => Promise.resolve(null),
    loadPayable: () => Promise.resolve(null),
    record: () => Promise.resolve(),
    markPaid: () => Promise.resolve(),
    loadRecordedPayment: () => Promise.resolve(payment),
    refund: ({ paymentId }) => {
      refunded.push(paymentId);
      return Promise.resolve();
    },
  };
}

describe('RefundInvoicePaymentUseCase', () => {
  it('refunds a recorded payment and logs a refunded event', async () => {
    const r = repo({ invoiceId: 'inv-1', alreadyRefunded: false });
    const rec = recorder();
    await new RefundInvoicePaymentUseCase(r, rec, clock).execute({
      paymentId: 'pay-1',
      reason: 'Duplicate charge',
      adminId: 'admin-3',
    });
    expect(r.refunded).toEqual(['pay-1']);
    expect(rec.events).toEqual([
      {
        paymentId: 'pay-1',
        type: 'REFUNDED',
        at: NOW,
        actorType: 'ADMIN',
        actorAdminId: 'admin-3',
        detail: 'Duplicate charge',
      },
    ]);
  });

  it('rejects an already refunded payment', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(
        repo({ invoiceId: 'inv-1', alreadyRefunded: true }),
        recorder(),
        clock,
      ).execute({ paymentId: 'pay-1', reason: null, adminId: 'admin-3' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the payment is missing', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(repo(null), recorder(), clock).execute({
        paymentId: 'pay-1',
        reason: null,
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
