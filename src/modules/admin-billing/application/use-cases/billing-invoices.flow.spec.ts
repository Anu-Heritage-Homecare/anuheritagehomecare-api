import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  BillingInvoiceDetailView,
  BillingInvoiceServicesView,
  BillingInvoicesReadModel,
  InvoiceHistoryEventView,
  InvoicePaymentRowView,
  InvoiceListFilter,
  InvoiceListRowView,
  InvoiceListView,
} from '../ports/billing-invoices-read.port';
import { GetBillingInvoiceHistoryUseCase } from './get-billing-invoice-history.use-case';
import { GetBillingInvoiceServicesUseCase } from './get-billing-invoice-services.use-case';
import { GetBillingInvoiceUseCase } from './get-billing-invoice.use-case';
import { ListBillingInvoicePaymentsUseCase } from './list-billing-invoice-payments.use-case';
import { ListBillingInvoicesUseCase } from './list-billing-invoices.use-case';

const NOW = new Date('2026-10-30T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function row(overrides: Partial<InvoiceListRowView> = {}): InvoiceListRowView {
  return {
    id: 'inv1',
    sequence: 451,
    issuedAt: new Date('2026-07-20T09:00:00.000Z'),
    billingAccountId: 'a1',
    billingAccountName: 'Adeyemi Family Account',
    careRecipientName: 'Funmilayo Adeyemi',
    amountMinor: 45_000_000,
    currency: 'NGN',
    dueDate: new Date('2026-07-28T00:00:00.000Z'),
    status: 'PAID',
    ...overrides,
  };
}

describe('ListBillingInvoicesUseCase', () => {
  it('maps rows to invoice numbers, paginates and returns the tab counts', async () => {
    let captured: InvoiceListFilter | null = null;
    const view: InvoiceListView = {
      rows: [row()],
      total: 342,
      counts: {
        all: 342,
        draft: 0,
        awaitingPayment: 45,
        partiallyPaid: 8,
        overdue: 12,
        paid: 247,
      },
    };
    const reads: BillingInvoicesReadModel = {
      list: (filter) => {
        captured = filter;
        return Promise.resolve(view);
      },
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };

    const result = await new ListBillingInvoicesUseCase(reads, clock).execute({
      status: 'PAID',
      search: null,
      billingAccountId: null,
      dueFrom: null,
      dueTo: null,
      minAmountMinor: null,
      maxAmountMinor: null,
      page: 1,
      pageSize: null,
    });

    expect(captured).not.toBeNull();
    expect((captured as unknown as InvoiceListFilter).pageSize).toBe(7);
    expect((captured as unknown as InvoiceListFilter).status).toBe('PAID');
    expect(result.total).toBe(342);
    expect(result.totalPages).toBe(49); // 342 over 7 rounds up to 49 pages
    expect(result.tabs.paid).toBe(247);
    expect(result.invoices[0]).toMatchObject({
      number: 'INV-2026-451',
      billingAccountName: 'Adeyemi Family Account',
      careRecipientName: 'Funmilayo Adeyemi',
      dueDate: '2026-07-28T00:00:00.000Z',
      status: 'PAID',
    });
  });

  it('passes a null billing account through as null and keeps a blank account name', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () =>
        Promise.resolve({
          rows: [row({ billingAccountId: null, billingAccountName: null, status: 'OVERDUE' })],
          total: 1,
          counts: { all: 1, draft: 0, awaitingPayment: 0, partiallyPaid: 0, overdue: 1, paid: 0 },
        }),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    const result = await new ListBillingInvoicesUseCase(reads, clock).execute({
      status: null,
      search: null,
      billingAccountId: null,
      dueFrom: null,
      dueTo: null,
      minAmountMinor: null,
      maxAmountMinor: null,
      page: 1,
      pageSize: 7,
    });
    expect(result.invoices[0].billingAccountId).toBeNull();
    expect(result.invoices[0].billingAccountName).toBeNull();
  });
});

describe('GetBillingInvoiceUseCase', () => {
  function detailView(): BillingInvoiceDetailView {
    return {
      id: 'inv1',
      sequence: 451,
      issuedAt: new Date('2026-06-30T00:00:00.000Z'),
      dueDate: new Date('2026-07-30T00:00:00.000Z'),
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-31T00:00:00.000Z'),
      status: 'AWAITING_PAYMENT',
      billingAccountId: 'a1',
      billingAccountName: 'Adeyemi Family Account',
      careRecipientName: 'Funmilayo Adeyemi',
      careRecipientPhotoKey: null,
      currency: 'NGN',
      totalAmountMinor: 145_000_000,
      insuranceCoveredMinor: 0,
      amountPaidMinor: 0,
      lineItems: [
        {
          serviceName: 'Personal Care',
          amountMinor: 60_000_000,
          quantity: null,
          unit: null,
          rateMinor: null,
        },
      ],
    };
  }

  it('derives the invoice number, Net terms, balance and percent paid', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(detailView()),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    const result = await new GetBillingInvoiceUseCase(reads, clock).execute('inv1');

    expect(result.number).toBe('INV-2026-451');
    expect(result.paymentTerms).toBe('Net 30'); // 30 Jun to 30 Jul is 30 days
    expect(result.balanceDueMinor).toBe(145_000_000);
    expect(result.percentPaid).toBe(0);
    expect(result.lineItems[0]).toMatchObject({ serviceName: 'Personal Care', rateMinor: null });
  });

  it('computes a partial percent paid', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve({ ...detailView(), amountPaidMinor: 72_500_000 }),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    const result = await new GetBillingInvoiceUseCase(reads, clock).execute('inv1');
    expect(result.balanceDueMinor).toBe(72_500_000);
    expect(result.percentPaid).toBe(50);
  });

  it('throws when the invoice is missing', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    await expect(
      new GetBillingInvoiceUseCase(reads, clock).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('GetBillingInvoiceServicesUseCase', () => {
  function servicesView(): BillingInvoiceServicesView {
    return {
      currency: 'NGN',
      servicePeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      servicePeriodEnd: new Date('2026-07-31T00:00:00.000Z'),
      services: [
        {
          serviceName: 'Personal Care Support',
          category: 'Care & Support',
          hoursUnits: 62,
          unit: 'hr',
          rateMinor: 500_000,
          amountMinor: 31_000_000,
          serviceDateStart: new Date('2026-07-01T00:00:00.000Z'),
          serviceDateEnd: new Date('2026-07-31T00:00:00.000Z'),
          assignedCaregiver: 'Chioma Nwachukwu',
        },
        {
          serviceName: 'Overnight Night Care',
          category: null,
          hoursUnits: null,
          unit: null,
          rateMinor: null,
          amountMinor: 42_500_000,
          serviceDateStart: null,
          serviceDateEnd: null,
          assignedCaregiver: null,
        },
      ],
    };
  }

  it('maps services, counts the distinct names and sums the amount', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(servicesView()),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    const result = await new GetBillingInvoiceServicesUseCase(reads).execute('inv1');

    expect(result.distinctCount).toBe(2);
    expect(result.summaryAmountMinor).toBe(73_500_000);
    expect(result.servicePeriodStart).toBe('2026-07-01T00:00:00.000Z');
    expect(result.services[0]).toMatchObject({
      serviceName: 'Personal Care Support',
      category: 'Care & Support',
      hoursUnits: 62,
      serviceDateStart: '2026-07-01T00:00:00.000Z',
      serviceDateEnd: '2026-07-31T00:00:00.000Z',
      assignedCaregiver: 'Chioma Nwachukwu',
    });
  });

  it('throws when the invoice is missing', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    await expect(
      new GetBillingInvoiceServicesUseCase(reads).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ListBillingInvoicePaymentsUseCase', () => {
  function payment(overrides: Partial<InvoicePaymentRowView> = {}): InvoicePaymentRowView {
    return {
      id: 'p1',
      sequence: 84729103,
      amountMinor: 25_000_000,
      currency: 'NGN',
      methodLabel: 'Bank Transfer',
      receivedAt: new Date('2026-08-12T00:00:00.000Z'),
      ...overrides,
    };
  }

  it('maps payments to transaction numbers with a completed status', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve([payment()]),
      history: () => Promise.resolve(null),
    };
    const result = await new ListBillingInvoicePaymentsUseCase(reads).execute('inv1');

    expect(result.total).toBe(1);
    expect(result.payments[0]).toMatchObject({
      reference: 'TXN-84729103',
      method: 'Bank Transfer',
      receivedAt: '2026-08-12T00:00:00.000Z',
      status: 'COMPLETED',
    });
  });

  it('returns an empty list for an invoice with no payments', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve([]),
      history: () => Promise.resolve(null),
    };
    const result = await new ListBillingInvoicePaymentsUseCase(reads).execute('inv1');
    expect(result.total).toBe(0);
    expect(result.payments).toEqual([]);
  });

  it('throws when the invoice is missing', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    await expect(
      new ListBillingInvoicePaymentsUseCase(reads).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('GetBillingInvoiceHistoryUseCase', () => {
  it('maps lifecycle events to titles with performedBy null', async () => {
    const events: InvoiceHistoryEventView[] = [
      {
        type: 'PAYMENT_RECORDED',
        at: new Date('2026-07-14T16:45:00.000Z'),
        amountMinor: 60_000_000,
        methodLabel: 'Card (Mastercard)',
        performedBy: null,
      },
      {
        type: 'INVOICE_CREATED',
        at: new Date('2026-07-01T09:00:00.000Z'),
        amountMinor: null,
        methodLabel: null,
        performedBy: null,
      },
    ];
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(events),
    };
    const result = await new GetBillingInvoiceHistoryUseCase(reads).execute('inv1');

    expect(result.total).toBe(2);
    expect(result.events[0]).toMatchObject({
      type: 'PAYMENT_RECORDED',
      title: 'Payment Recorded',
      methodLabel: 'Card (Mastercard)',
      performedBy: null,
    });
    expect(result.events[1]).toMatchObject({ title: 'Invoice Created', amountMinor: null });
  });

  it('throws when the invoice is missing', async () => {
    const reads: BillingInvoicesReadModel = {
      list: () => Promise.reject(new Error('not used')),
      detail: () => Promise.resolve(null),
      services: () => Promise.resolve(null),
      payments: () => Promise.resolve(null),
      history: () => Promise.resolve(null),
    };
    await expect(
      new GetBillingInvoiceHistoryUseCase(reads).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
