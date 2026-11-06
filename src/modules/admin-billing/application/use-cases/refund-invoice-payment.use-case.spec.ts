import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  InvoicePaymentWriteRepository,
  RefundablePayment,
} from '../../domain/invoice-payment-write.repository';
import { RefundInvoicePaymentUseCase } from './refund-invoice-payment.use-case';

const NOW = new Date('2026-11-06T10:00:00.000Z');
const clock = { now: () => NOW };

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
  it('refunds a recorded payment', async () => {
    const r = repo({ invoiceId: 'inv-1', alreadyRefunded: false });
    await new RefundInvoicePaymentUseCase(r, clock).execute({
      paymentId: 'pay-1',
      reason: 'Duplicate charge',
      adminId: 'admin-3',
    });
    expect(r.refunded).toEqual(['pay-1']);
  });

  it('rejects an already refunded payment', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(
        repo({ invoiceId: 'inv-1', alreadyRefunded: true }),
        clock,
      ).execute({ paymentId: 'pay-1', reason: null, adminId: 'admin-3' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the payment is missing', async () => {
    await expect(
      new RefundInvoicePaymentUseCase(repo(null), clock).execute({
        paymentId: 'pay-1',
        reason: null,
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
