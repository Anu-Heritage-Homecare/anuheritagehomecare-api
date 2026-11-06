import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  InvoicePaymentContext,
  InvoicePaymentWriteRepository,
  NewInvoicePayment,
} from '../../domain/invoice-payment-write.repository';
import { RecordPaymentEvent } from '../../domain/payment-event.recorder';
import { RecordInvoicePaymentUseCase } from './record-invoice-payment.use-case';

const NOW = new Date('2026-11-06T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'pay-1' };

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
  context: InvoicePaymentContext | null,
): InvoicePaymentWriteRepository & { recorded: NewInvoicePayment[]; paid: string[] } {
  const recorded: NewInvoicePayment[] = [];
  const paid: string[] = [];
  return {
    recorded,
    paid,
    loadForPayment: () => Promise.resolve(context),
    loadPayable: () => Promise.resolve(null),
    record: (payment) => {
      recorded.push(payment);
      return Promise.resolve();
    },
    markPaid: (invoiceId) => {
      paid.push(invoiceId);
      return Promise.resolve();
    },
    loadRecordedPayment: () => Promise.resolve(null),
    refund: () => Promise.resolve(),
  };
}

const context = (over: Partial<InvoicePaymentContext> = {}): InvoicePaymentContext => ({
  careRecipientId: 'r1',
  currency: Currency.NigerianNaira,
  patientDueMinor: 100_000_000,
  paidMinor: 0,
  alreadyPaid: false,
  ...over,
});

describe('RecordInvoicePaymentUseCase', () => {
  it('records the payment and settles the invoice once the balance is cleared', async () => {
    const r = repo(context({ patientDueMinor: 100_000_000, paidMinor: 40_000_000 }));
    const result = await new RecordInvoicePaymentUseCase(r, recorder(), clock, ids).execute({
      invoiceId: 'inv-1',
      amountMinor: 60_000_000,
      methodLabel: 'Bank Transfer',
      receivedAt: null,
      referenceNumber: null,
      bankName: null,
      notes: null,
      adminId: 'admin-1',
    });
    expect(result).toEqual({ id: 'pay-1', invoicePaid: true });
    expect(r.recorded[0]).toMatchObject({ amountMinor: 60_000_000, methodLabel: 'Bank Transfer' });
    expect(r.paid).toEqual(['inv-1']);
  });

  it('leaves the invoice open on a partial payment', async () => {
    const r = repo(context({ patientDueMinor: 100_000_000, paidMinor: 0 }));
    const result = await new RecordInvoicePaymentUseCase(r, recorder(), clock, ids).execute({
      invoiceId: 'inv-1',
      amountMinor: 30_000_000,
      methodLabel: null,
      receivedAt: null,
      referenceNumber: null,
      bankName: null,
      notes: null,
      adminId: 'admin-1',
    });
    expect(result.invoicePaid).toBe(false);
    expect(r.paid).toEqual([]);
  });

  it('records the initiated, confirmed and receipt generated history events', async () => {
    const rec = recorder();
    await new RecordInvoicePaymentUseCase(repo(context()), rec, clock, ids).execute({
      invoiceId: 'inv-1',
      amountMinor: 1_000_000,
      methodLabel: 'Bank Transfer',
      receivedAt: new Date('2026-11-05T09:00:00.000Z'),
      referenceNumber: null,
      bankName: null,
      notes: null,
      adminId: 'admin-1',
    });
    expect(rec.events.map((e) => e.type)).toEqual(['INITIATED', 'CONFIRMED', 'RECEIPT_GENERATED']);
    const initiated = rec.events.find((e) => e.type === 'INITIATED');
    expect(initiated?.at).toEqual(new Date('2026-11-05T09:00:00.000Z'));
    expect(initiated?.actorLabel).toBe('Bank Transfer');
    const confirmed = rec.events.find((e) => e.type === 'CONFIRMED');
    expect(confirmed).toMatchObject({ actorType: 'ADMIN', actorAdminId: 'admin-1', at: NOW });
  });

  it('rejects a non positive amount', async () => {
    await expect(
      new RecordInvoicePaymentUseCase(repo(context()), recorder(), clock, ids).execute({
        invoiceId: 'inv-1',
        amountMinor: 0,
        methodLabel: null,
        receivedAt: null,
        referenceNumber: null,
        bankName: null,
        notes: null,
        adminId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects an already paid invoice', async () => {
    await expect(
      new RecordInvoicePaymentUseCase(
        repo(context({ alreadyPaid: true })),
        recorder(),
        clock,
        ids,
      ).execute({
        invoiceId: 'inv-1',
        amountMinor: 1,
        methodLabel: null,
        receivedAt: null,
        referenceNumber: null,
        bankName: null,
        notes: null,
        adminId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the invoice is missing', async () => {
    await expect(
      new RecordInvoicePaymentUseCase(repo(null), recorder(), clock, ids).execute({
        invoiceId: 'inv-1',
        amountMinor: 1,
        methodLabel: null,
        receivedAt: null,
        referenceNumber: null,
        bankName: null,
        notes: null,
        adminId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
