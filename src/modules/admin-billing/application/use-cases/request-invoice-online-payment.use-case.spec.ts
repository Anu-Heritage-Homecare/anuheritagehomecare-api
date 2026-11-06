import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Payment } from '@modules/payments/domain/payment.entity';
import { PaymentGateway } from '@modules/payments/application/ports/payment-gateway.port';
import { PaymentRepository } from '@modules/payments/domain/payment.repository';
import {
  InvoicePayable,
  InvoicePaymentWriteRepository,
} from '../../domain/invoice-payment-write.repository';
import { RequestInvoiceOnlinePaymentUseCase } from './request-invoice-online-payment.use-case';

const NOW = new Date('2026-11-06T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'pay-1' };

function invoiceRepo(payable: InvoicePayable | null): InvoicePaymentWriteRepository {
  return {
    loadForPayment: () => Promise.resolve(null),
    loadPayable: () => Promise.resolve(payable),
    record: () => Promise.resolve(),
    markPaid: () => Promise.resolve(),
  };
}

const gateway = {
  initialize: () =>
    Promise.resolve({ providerReference: 'prov_pay-1', authorizationUrl: 'https://pay/link' }),
} as unknown as PaymentGateway;

function paymentRepo(): PaymentRepository & { saved: Payment[] } {
  const saved: Payment[] = [];
  return {
    saved,
    save: (payment) => {
      saved.push(payment);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(null),
    findByProviderReference: () => Promise.resolve(null),
    listByOwner: () => Promise.resolve([]),
  };
}

const payable = (over: Partial<InvoicePayable> = {}): InvoicePayable => ({
  ownerId: 'owner-1',
  ownerEmail: 'owner@example.com',
  currency: Currency.NigerianNaira,
  balanceMinor: 100_000_000,
  alreadyPaid: false,
  ...over,
});

describe('RequestInvoiceOnlinePaymentUseCase', () => {
  it('starts a charge for the balance and records a pending invoice payment', async () => {
    const payments = paymentRepo();
    const result = await new RequestInvoiceOnlinePaymentUseCase(
      invoiceRepo(payable()),
      gateway,
      payments,
      clock,
      ids,
    ).execute({ invoiceId: 'inv-1' });

    expect(result.authorizationUrl).toBe('https://pay/link');
    expect(result.amountMinor).toBe(100_000_000);
    expect(payments.saved[0].payableId).toBe('inv-1');
  });

  it('rejects an invoice with no outstanding balance', async () => {
    await expect(
      new RequestInvoiceOnlinePaymentUseCase(
        invoiceRepo(payable({ balanceMinor: 0 })),
        gateway,
        paymentRepo(),
        clock,
        ids,
      ).execute({ invoiceId: 'inv-1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the invoice is missing', async () => {
    await expect(
      new RequestInvoiceOnlinePaymentUseCase(
        invoiceRepo(null),
        gateway,
        paymentRepo(),
        clock,
        ids,
      ).execute({ invoiceId: 'inv-1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
