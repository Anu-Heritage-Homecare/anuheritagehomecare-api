import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Invoice } from '../../domain/invoice.entity';
import { InvoiceRepository } from '../../domain/invoice.repository';
import {
  BillingPaymentDirectory,
  BillingPaymentView,
  BillingPlanDirectory,
  BillingSubscriptionDirectory,
  BillingSubscriptionView,
} from '../ports/billing-directories.port';
import { GetBillingDashboardUseCase } from './get-billing-dashboard.use-case';
import { GetInvoiceUseCase } from './get-invoice.use-case';
import { GetReceiptUseCase } from './get-receipt.use-case';
import { IssueInvoiceUseCase } from './issue-invoice.use-case';
import { ListInvoicesUseCase } from './list-invoices.use-case';
import { ListReceiptsUseCase } from './list-receipts.use-case';

const NOW = new Date('2026-08-10T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

const SUB: BillingSubscriptionView = {
  id: 'sub-1',
  ownerId: 'owner-1',
  careRecipientId: 'r1',
  planType: 'PREMIUM',
  currency: 'NGN',
  monthlyPriceMinor: 18_900_000,
  startDate: new Date('2026-07-15T00:00:00.000Z'),
  active: true,
};

function subscriptionDirectory(subs: BillingSubscriptionView[]): BillingSubscriptionDirectory {
  return {
    listActiveForOwner: (ownerId) =>
      Promise.resolve(subs.filter((s) => s.ownerId === ownerId && s.active)),
    findById: (id) => Promise.resolve(subs.find((s) => s.id === id) ?? null),
  };
}

function planDirectory(): BillingPlanDirectory {
  return {
    nameForType: (type) => Promise.resolve(type === 'PREMIUM' ? 'Premium Home Care' : null),
  };
}

function paymentDirectory(payments: BillingPaymentView[]): BillingPaymentDirectory {
  return {
    listForOwner: () => Promise.resolve([...payments]),
    findForOwner: (_ownerId, id) => Promise.resolve(payments.find((p) => p.id === id) ?? null),
  };
}

function payment(over: Partial<BillingPaymentView>): BillingPaymentView {
  return {
    id: 'pay-1',
    currency: 'NGN',
    amountMinor: 8_900_000,
    provider: 'PAYSTACK',
    reference: 'ref-1',
    payableType: 'SUBSCRIPTION',
    payableId: 'sub-1',
    succeeded: true,
    createdAt: new Date('2026-08-05T00:00:00.000Z'),
    ...over,
  };
}

class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly byId = new Map<string, Invoice>();

  save(invoice: Invoice): Promise<void> {
    for (const [id, existing] of this.byId) {
      const samePeriod =
        existing.subscriptionId === invoice.subscriptionId &&
        existing.periodStart.getTime() === invoice.periodStart.getTime();
      if (samePeriod && id !== invoice.id) {
        this.byId.delete(id);
      }
    }
    this.byId.set(invoice.id, invoice);
    return Promise.resolve();
  }

  findById(id: string): Promise<Invoice | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }

  listForOwner(ownerId: string): Promise<Invoice[]> {
    return Promise.resolve(
      [...this.byId.values()]
        .filter((i) => i.ownerId === ownerId)
        .sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime()),
    );
  }
}

function incrementingIds(): IdGenerator {
  let n = 0;
  return { generate: () => `inv-${(n += 1)}` };
}

describe('billing dashboard', () => {
  it('composes the plan card and this-month summary', async () => {
    const payments = [
      payment({ id: 'pay-1', amountMinor: 8_900_000, createdAt: new Date('2026-08-05') }),
      payment({ id: 'pay-0', amountMinor: 5_000_000, createdAt: new Date('2026-07-20') }),
      payment({ id: 'pay-x', succeeded: false, createdAt: new Date('2026-08-06') }),
    ];
    const useCase = new GetBillingDashboardUseCase(
      subscriptionDirectory([SUB]),
      planDirectory(),
      paymentDirectory(payments),
      clock,
    );

    const result = await useCase.execute({ ownerId: 'owner-1' });

    expect(result.plan).toEqual({
      planName: 'Premium Home Care',
      planType: 'PREMIUM',
      currency: 'NGN',
      monthlyPriceMinor: 18_900_000,
      nextPaymentDate: '2026-08-15',
      autoPay: true,
    });
    expect(result.summary).toEqual({
      currency: 'NGN',
      paidThisMonthMinor: 8_900_000, // only the August charge counts
      upcomingPaymentMinor: 18_900_000,
      upcomingPaymentDate: '2026-08-15',
    });
  });

  it('returns a null plan with no active subscription', async () => {
    const useCase = new GetBillingDashboardUseCase(
      subscriptionDirectory([]),
      planDirectory(),
      paymentDirectory([]),
      clock,
    );
    const result = await useCase.execute({ ownerId: 'owner-1' });
    expect(result.plan).toBeNull();
    expect(result.summary.upcomingPaymentMinor).toBe(0);
  });
});

describe('receipts', () => {
  const payments = [
    payment({ id: 'pay-1', createdAt: new Date('2026-08-05') }),
    payment({ id: 'pay-0', createdAt: new Date('2026-07-20') }),
    payment({ id: 'pay-x', succeeded: false }),
  ];

  it('lists settled payments newest first, excluding unsettled', async () => {
    const list = new ListReceiptsUseCase(paymentDirectory(payments));
    const receipts = await list.execute({ ownerId: 'owner-1' });
    expect(receipts.map((r) => r.id)).toEqual(['pay-1', 'pay-0']);
  });

  it('fetches one receipt and 404s a pending or unknown one', async () => {
    const get = new GetReceiptUseCase(paymentDirectory(payments));
    const receipt = await get.execute({ ownerId: 'owner-1', receiptId: 'pay-1' });
    expect(receipt).toMatchObject({ id: 'pay-1', currency: 'NGN', forType: 'SUBSCRIPTION' });

    await expect(get.execute({ ownerId: 'owner-1', receiptId: 'pay-x' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
    await expect(get.execute({ ownerId: 'owner-1', receiptId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});

describe('invoices', () => {
  let invoices: InMemoryInvoiceRepository;

  function issuer(payments: BillingPaymentView[]): IssueInvoiceUseCase {
    return new IssueInvoiceUseCase(
      subscriptionDirectory([SUB]),
      paymentDirectory(payments),
      invoices,
      incrementingIds(),
      clock,
    );
  }

  beforeEach(() => {
    invoices = new InMemoryInvoiceRepository();
  });

  it('issues an invoice for the period, marked paid when a payment covers it', async () => {
    const detail = await issuer([payment({ createdAt: new Date('2026-08-05') })]).execute({
      subscriptionId: 'sub-1',
      reference: NOW,
    });

    expect(detail).toMatchObject({
      number: 'INV-202607-sub-1',
      currency: 'NGN',
      amountMinor: 18_900_000,
      periodStart: '2026-07-15',
      periodEnd: '2026-08-14',
      dueDate: '2026-07-15',
      status: 'PAID',
    });
    expect(detail.paidAt).not.toBeNull();
  });

  it('issues as ISSUED when no payment covers the period', async () => {
    const detail = await issuer([]).execute({ subscriptionId: 'sub-1', reference: NOW });
    expect(detail.status).toBe('ISSUED');
    expect(detail.paidAt).toBeNull();
  });

  it('is idempotent per subscription period, and lists and fetches owner scoped', async () => {
    await issuer([]).execute({ subscriptionId: 'sub-1', reference: NOW });
    await issuer([]).execute({ subscriptionId: 'sub-1', reference: NOW });

    const list = await new ListInvoicesUseCase(invoices).execute({ ownerId: 'owner-1' });
    expect(list).toHaveLength(1);

    const get = new GetInvoiceUseCase(invoices);
    const detail = await get.execute({ ownerId: 'owner-1', invoiceId: list[0].id });
    expect(detail.number).toBe('INV-202607-sub-1');

    await expect(
      get.execute({ ownerId: 'someone-else', invoiceId: list[0].id }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
