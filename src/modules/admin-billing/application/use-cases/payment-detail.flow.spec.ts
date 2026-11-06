import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AdminDirectory } from '../ports/admin-directory.port';
import { BillingPaymentsReadModel, PaymentDetailView } from '../ports/billing-payments-read.port';
import { GetPaymentDetailUseCase } from './get-payment-detail.use-case';

function detailView(overrides: Partial<PaymentDetailView> = {}): PaymentDetailView {
  return {
    id: 'pay-1',
    sequence: 892,
    receivedAt: new Date('2026-07-18T09:12:00.000Z'),
    amountMinor: 145_000_000,
    currency: 'NGN',
    methodLabel: 'Bank Transfer',
    referenceNumber: 'TXN-1092309',
    bankName: 'First Bank',
    notes: 'Payment received in First Bank business account.',
    refundedAt: null,
    invoiceSequence: 451,
    invoiceIssuedAt: new Date('2026-07-01T00:00:00.000Z'),
    invoiceAmountMinor: 145_000_000,
    invoiceStatus: 'PAID',
    accountName: 'Adeyemi Family',
    events: [
      {
        type: 'CONFIRMED',
        at: new Date('2026-07-18T10:20:00.000Z'),
        actorType: 'ADMIN',
        actorAdminId: 'admin-7',
        actorLabel: null,
        detail: null,
      },
      {
        type: 'INITIATED',
        at: new Date('2026-07-18T09:12:00.000Z'),
        actorType: 'SYSTEM',
        actorAdminId: null,
        actorLabel: 'Bank Transfer',
        detail: null,
      },
    ],
    ...overrides,
  };
}

function reads(view: PaymentDetailView | null): BillingPaymentsReadModel {
  return {
    list: () => Promise.reject(new Error('unused')),
    detail: () => Promise.resolve(view),
  };
}

const admins: AdminDirectory = {
  names: (ids) =>
    Promise.resolve(
      new Map(ids.filter((id): id is string => id !== null).map((id) => [id, 'Sarah Jenkins'])),
    ),
};

describe('GetPaymentDetailUseCase', () => {
  it('composes the card, linked invoice and history with resolved admin names', async () => {
    const result = await new GetPaymentDetailUseCase(reads(detailView()), admins).execute('pay-1');

    expect(result.reference).toBe('PAY-2026-0892');
    expect(result.status).toBe('COMPLETED');
    expect(result.notes).toContain('First Bank');
    expect(result.linkedInvoice).toEqual({
      number: 'INV-2026-451',
      accountName: 'Adeyemi Family',
      amountMinor: 145_000_000,
      status: 'PAID',
    });
    const confirmed = result.history.find((e) => e.type === 'CONFIRMED');
    expect(confirmed).toMatchObject({ title: 'Payment Confirmed', performedBy: 'Sarah Jenkins' });
    const initiated = result.history.find((e) => e.type === 'INITIATED');
    expect(initiated?.performedBy).toBe('Bank Transfer');
  });

  it('marks a refunded payment and keeps a null linked invoice', async () => {
    const result = await new GetPaymentDetailUseCase(
      reads(
        detailView({
          refundedAt: new Date('2026-07-20T00:00:00.000Z'),
          invoiceSequence: null,
          invoiceIssuedAt: null,
        }),
      ),
      admins,
    ).execute('pay-1');

    expect(result.status).toBe('REFUNDED');
    expect(result.linkedInvoice).toBeNull();
  });

  it('throws when the payment is unknown', async () => {
    await expect(
      new GetPaymentDetailUseCase(reads(null), admins).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
