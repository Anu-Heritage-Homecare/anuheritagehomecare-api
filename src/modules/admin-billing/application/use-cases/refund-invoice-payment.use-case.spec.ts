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

type RefundCall = { paymentId: string; amountMinor: number; method: string | null };

function repo(payment: RefundablePayment | null): InvoicePaymentWriteRepository & {
  refunds: RefundCall[];
} {
  const refunds: RefundCall[] = [];
  return {
    refunds,
    loadForPayment: () => Promise.resolve(null),
    loadPayable: () => Promise.resolve(null),
    record: () => Promise.resolve(),
    markPaid: () => Promise.resolve(),
    loadRecordedPayment: () => Promise.resolve(payment),
    refund: ({ paymentId, amountMinor, method }) => {
      refunds.push({ paymentId, amountMinor, method });
      return Promise.resolve();
    },
  };
}

describe('RefundInvoicePaymentUseCase', () => {
  it('records a partial refund and logs a refunded event', async () => {
    const r = repo({ invoiceId: 'inv-1', amountMinor: 45_000_000, refundedAmountMinor: 0 });
    const rec = recorder();
    await new RefundInvoicePaymentUseCase(r, rec, clock).execute({
      paymentId: 'pay-1',
      amountMinor: 20_000_000,
      method: 'Bank Transfer',
      reason: 'Overpayment',
      notes: 'Partial return',
      adminId: 'admin-3',
    });
    expect(r.refunds).toEqual([
      { paymentId: 'pay-1', amountMinor: 20_000_000, method: 'Bank Transfer' },
    ]);
    expect(rec.events).toEqual([
      {
        paymentId: 'pay-1',
        type: 'REFUNDED',
        at: NOW,
        actorType: 'ADMIN',
        actorAdminId: 'admin-3',
        detail: 'Overpayment',
      },
    ]);
  });

  it('allows a second partial refund up to the remaining balance', async () => {
    const r = repo({
      invoiceId: 'inv-1',
      amountMinor: 45_000_000,
      refundedAmountMinor: 20_000_000,
    });
    await new RefundInvoicePaymentUseCase(r, recorder(), clock).execute({
      paymentId: 'pay-1',
      amountMinor: 25_000_000,
      method: null,
      reason: null,
      notes: null,
      adminId: 'admin-3',
    });
    expect(r.refunds[0].amountMinor).toBe(25_000_000);
  });

  it('rejects a refund that exceeds the remaining balance', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(
        repo({ invoiceId: 'inv-1', amountMinor: 45_000_000, refundedAmountMinor: 40_000_000 }),
        recorder(),
        clock,
      ).execute({
        paymentId: 'pay-1',
        amountMinor: 10_000_000,
        method: null,
        reason: null,
        notes: null,
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a fully refunded payment', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(
        repo({ invoiceId: 'inv-1', amountMinor: 45_000_000, refundedAmountMinor: 45_000_000 }),
        recorder(),
        clock,
      ).execute({
        paymentId: 'pay-1',
        amountMinor: 1,
        method: null,
        reason: null,
        notes: null,
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a non positive amount', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(
        repo({ invoiceId: 'inv-1', amountMinor: 45_000_000, refundedAmountMinor: 0 }),
        recorder(),
        clock,
      ).execute({
        paymentId: 'pay-1',
        amountMinor: 0,
        method: null,
        reason: null,
        notes: null,
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the payment is missing', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(repo(null), recorder(), clock).execute({
        paymentId: 'pay-1',
        amountMinor: 1_000,
        method: null,
        reason: null,
        notes: null,
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
