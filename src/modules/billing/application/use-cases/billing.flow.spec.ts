import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { InitiatePaymentUseCase } from '@modules/payments/application/use-cases/initiate-payment.use-case';
import { Invoice } from '../../domain/invoice.entity';
import { InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceSummaryResult } from '../dto/billing.result';
import {
  BillingPaymentDirectory,
  BillingPaymentView,
  BillingPlanDirectory,
  BillingSubscriptionDirectory,
  BillingSubscriptionView,
} from '../ports/billing-directories.port';
import { ConfigService } from '@nestjs/config';
import { GetBillingDashboardUseCase } from './get-billing-dashboard.use-case';
import { GetUpcomingPaymentUseCase } from './get-upcoming-payment.use-case';
import { GetInvoiceUseCase } from './get-invoice.use-case';
import { GetReceiptUseCase } from './get-receipt.use-case';
import { IssueInvoiceUseCase } from './issue-invoice.use-case';
import { ListInvoicesUseCase } from './list-invoices.use-case';
import { ListReceiptsUseCase } from './list-receipts.use-case';
import { PayInvoiceUseCase } from './pay-invoice.use-case';
import { UpgradeSubscriptionPlanUseCase } from './upgrade-subscription-plan.use-case';
import { ChangeSubscriptionPlanUseCase } from '@modules/bookings/application/use-cases/change-subscription-plan.use-case';
import { ChangeProviderSubscriptionPlanUseCase } from '@modules/payments/application/use-cases/change-subscription-plan.use-case';

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
    priceForType: (type) =>
      Promise.resolve(
        type === 'PREMIUM'
          ? {
              monthlyPriceMinor: 18_900_000,
              stripePriceId: 'price_premium',
              paystackPlanCode: 'PLN_premium',
            }
          : null,
      ),
  };
}

function paymentDirectory(
  payments: BillingPaymentView[],
  defaultCard: { brand: string; last4: string } | null = null,
): BillingPaymentDirectory {
  return {
    listForOwner: () => Promise.resolve([...payments]),
    findForOwner: (_ownerId, id) => Promise.resolve(payments.find((p) => p.id === id) ?? null),
    defaultCardForOwner: () => Promise.resolve(defaultCard),
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

  function issuer(): IssueInvoiceUseCase {
    return new IssueInvoiceUseCase(
      subscriptionDirectory([SUB]),
      invoices,
      incrementingIds(),
      clock,
    );
  }

  beforeEach(() => {
    invoices = new InMemoryInvoiceRepository();
  });

  it('issues an invoice for the period as ISSUED', async () => {
    const detail = await issuer().execute({ subscriptionId: 'sub-1', reference: NOW });

    expect(detail).toMatchObject({
      number: 'INV-202607-sub-1',
      currency: 'NGN',
      amountMinor: 18_900_000,
      periodStart: '2026-07-15',
      periodEnd: '2026-08-14',
      dueDate: '2026-07-15',
      status: 'ISSUED',
    });
    expect(detail.paidAt).toBeNull();
  });

  it('itemises the office line items with a tax and discount breakdown', async () => {
    const detail = await issuer().execute({
      subscriptionId: 'sub-1',
      reference: NOW,
      lineItems: [
        { description: 'Medication Support', amountMinor: 100_000 },
        { description: 'Meal Assistance', amountMinor: 50_000 },
      ],
      taxRateBps: 333,
      discountMinor: 5_000,
    });

    expect(detail.lineItems).toEqual([
      { description: 'Medication Support', amountMinor: 100_000 },
      { description: 'Meal Assistance', amountMinor: 50_000 },
    ]);
    expect(detail.subtotalMinor).toBe(150_000);
    expect(detail.taxRateBps).toBe(333);
    expect(detail.taxMinor).toBe(4_995); // floor(150_000 * 333 / 10000)
    expect(detail.discountMinor).toBe(5_000);
    expect(detail.totalMinor).toBe(149_995); // 150_000 + 4_995 - 5_000
    expect(detail.amountMinor).toBe(149_995);
  });

  it('falls back to a single plan line when the office gives no items', async () => {
    const detail = await issuer().execute({ subscriptionId: 'sub-1', reference: NOW });
    expect(detail.lineItems).toEqual([{ description: 'PREMIUM plan', amountMinor: 18_900_000 }]);
    expect(detail.subtotalMinor).toBe(18_900_000);
    expect(detail.totalMinor).toBe(18_900_000);
  });

  it('reflects an invoice as paid on read once its charge settles', async () => {
    const issued = await issuer().execute({ subscriptionId: 'sub-1', reference: NOW });
    const invoicePayment = payment({
      id: 'pay-inv',
      payableType: 'INVOICE',
      payableId: issued.id,
      createdAt: new Date('2026-08-09'),
    });

    const get = new GetInvoiceUseCase(invoices, paymentDirectory([invoicePayment]));
    const detail = await get.execute({ ownerId: 'owner-1', invoiceId: issued.id });
    expect(detail.status).toBe('PAID');
    expect(detail.paidAt).not.toBeNull();

    const list = await new ListInvoicesUseCase(
      invoices,
      paymentDirectory([invoicePayment]),
    ).execute({ ownerId: 'owner-1' });
    expect(list[0].status).toBe('PAID');
  });

  it('filters by the Paid and Outstanding tabs', async () => {
    const sub2: BillingSubscriptionView = {
      ...SUB,
      id: 'sub-2',
      startDate: new Date('2026-06-15T00:00:00.000Z'),
    };
    const both = new IssueInvoiceUseCase(
      subscriptionDirectory([SUB, sub2]),
      invoices,
      incrementingIds(),
      clock,
    );
    await both.execute({ subscriptionId: 'sub-1', reference: NOW });
    const paidInvoice = await both.execute({ subscriptionId: 'sub-2', reference: NOW });
    const settling = payment({
      id: 'pay-inv',
      payableType: 'INVOICE',
      payableId: paidInvoice.id,
      createdAt: new Date('2026-08-09'),
    });

    const list = (filter?: 'PAID' | 'OUTSTANDING'): Promise<InvoiceSummaryResult[]> =>
      new ListInvoicesUseCase(invoices, paymentDirectory([settling])).execute({
        ownerId: 'owner-1',
        filter,
      });

    expect((await list()).length).toBe(2);
    expect((await list('PAID')).map((i) => i.status)).toEqual(['PAID']);
    expect((await list('OUTSTANDING')).map((i) => i.status)).toEqual(['ISSUED']);
  });

  it('is idempotent per subscription period, and fetches owner scoped', async () => {
    await issuer().execute({ subscriptionId: 'sub-1', reference: NOW });
    await issuer().execute({ subscriptionId: 'sub-1', reference: NOW });

    const list = await new ListInvoicesUseCase(invoices, paymentDirectory([])).execute({
      ownerId: 'owner-1',
    });
    expect(list).toHaveLength(1);

    const get = new GetInvoiceUseCase(invoices, paymentDirectory([]));
    await expect(
      get.execute({ ownerId: 'someone-else', invoiceId: list[0].id }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('pay invoice', () => {
  let invoices: InMemoryInvoiceRepository;

  async function anInvoice(): Promise<string> {
    const detail = await new IssueInvoiceUseCase(
      subscriptionDirectory([SUB]),
      invoices,
      incrementingIds(),
      clock,
    ).execute({ subscriptionId: 'sub-1', reference: NOW });
    return detail.id;
  }

  beforeEach(() => {
    invoices = new InMemoryInvoiceRepository();
  });

  it('initiates a charge for the invoice amount, resolved server side', async () => {
    const invoiceId = await anInvoice();
    const initiate = { execute: jest.fn().mockResolvedValue({ paymentId: 'p1' }) };
    const useCase = new PayInvoiceUseCase(
      invoices,
      paymentDirectory([]),
      initiate as unknown as InitiatePaymentUseCase,
    );

    await useCase.execute({ ownerId: 'owner-1', ownerEmail: 'a@b.com', invoiceId });

    expect(initiate.execute).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      ownerEmail: 'a@b.com',
      payableType: 'INVOICE',
      payableId: invoiceId,
      resolvedPayable: {
        ownerId: 'owner-1',
        currency: 'NGN',
        amountMinor: 18_900_000,
        alreadyPaid: false,
        recurring: null,
      },
    });
  });

  it('refuses to pay an invoice already settled', async () => {
    const invoiceId = await anInvoice();
    const settled = payment({ id: 'pay-inv', payableType: 'INVOICE', payableId: invoiceId });
    const initiate = { execute: jest.fn() };
    const useCase = new PayInvoiceUseCase(
      invoices,
      paymentDirectory([settled]),
      initiate as unknown as InitiatePaymentUseCase,
    );

    await expect(
      useCase.execute({ ownerId: 'owner-1', ownerEmail: 'a@b.com', invoiceId }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(initiate.execute).not.toHaveBeenCalled();
  });

  it('404s an invoice the owner does not own', async () => {
    const invoiceId = await anInvoice();
    const useCase = new PayInvoiceUseCase(invoices, paymentDirectory([]), {
      execute: jest.fn(),
    } as unknown as InitiatePaymentUseCase);

    await expect(
      useCase.execute({ ownerId: 'someone-else', ownerEmail: 'a@b.com', invoiceId }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('upgrade plan', () => {
  const usdStandard: BillingSubscriptionView = {
    id: 'sub-usd',
    ownerId: 'owner-1',
    careRecipientId: 'r1',
    planType: 'STANDARD',
    currency: 'USD',
    monthlyPriceMinor: 120_000,
    startDate: new Date('2026-07-15T00:00:00.000Z'),
    active: true,
  };
  const ngnPremium: BillingSubscriptionView = { ...SUB, id: 'sub-ngn', planType: 'STANDARD' };

  function useCase(
    subs: BillingSubscriptionView[],
    provider = { execute: jest.fn().mockResolvedValue(undefined) },
    ours = { execute: jest.fn().mockResolvedValue(undefined) },
  ): {
    upgrade: UpgradeSubscriptionPlanUseCase;
    provider: { execute: jest.Mock };
    ours: { execute: jest.Mock };
  } {
    const upgrade = new UpgradeSubscriptionPlanUseCase(
      subscriptionDirectory(subs),
      planDirectory(),
      provider as unknown as ChangeProviderSubscriptionPlanUseCase,
      ours as unknown as ChangeSubscriptionPlanUseCase,
    );
    return { upgrade, provider, ours };
  }

  it('changes the plan at the provider and on our record for a Stripe market', async () => {
    const { upgrade, provider, ours } = useCase([usdStandard]);

    const result = await upgrade.execute({
      ownerId: 'owner-1',
      subscriptionId: 'sub-usd',
      planType: 'PREMIUM',
    });

    expect(provider.execute).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      subscriptionId: 'sub-usd',
      newPlanReference: 'price_premium',
    });
    expect(ours.execute).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      subscriptionId: 'sub-usd',
      planType: 'PREMIUM',
      monthlyPriceMinor: 18_900_000,
      currency: 'USD',
    });
    expect(result).toEqual({
      subscriptionId: 'sub-usd',
      planType: 'PREMIUM',
      planName: 'Premium Home Care',
      currency: 'USD',
      monthlyPriceMinor: 18_900_000,
    });
  });

  it('rejects upgrading to the plan already held', async () => {
    const { upgrade } = useCase([{ ...usdStandard, planType: 'PREMIUM' }]);
    await expect(
      upgrade.execute({ ownerId: 'owner-1', subscriptionId: 'sub-usd', planType: 'PREMIUM' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a plan the catalog does not price', async () => {
    const { upgrade } = useCase([usdStandard]);
    await expect(
      upgrade.execute({ ownerId: 'owner-1', subscriptionId: 'sub-usd', planType: 'STANDARD_PLUS' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('is not available for a Paystack market yet', async () => {
    const { upgrade, provider } = useCase([ngnPremium]);
    await expect(
      upgrade.execute({ ownerId: 'owner-1', subscriptionId: 'sub-ngn', planType: 'PREMIUM' }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(provider.execute).not.toHaveBeenCalled();
  });

  it('404s a subscription the owner does not own', async () => {
    const { upgrade } = useCase([usdStandard]);
    await expect(
      upgrade.execute({ ownerId: 'someone-else', subscriptionId: 'sub-usd', planType: 'PREMIUM' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('upcoming payment', () => {
  function taxConfig(bpsByCountry: Record<string, number>): ConfigService {
    return {
      getOrThrow: () => ({ taxRateBpsByCountry: bpsByCountry }),
    } as unknown as ConfigService;
  }

  it('breaks the next charge into base, tax and total with the market rate', async () => {
    const useCase = new GetUpcomingPaymentUseCase(
      subscriptionDirectory([SUB]),
      paymentDirectory([], { brand: 'Visa', last4: '4242' }),
      clock,
      taxConfig({ NG: 333 }),
    );

    const result = await useCase.execute({ ownerId: 'owner-1', country: 'NG' });

    expect(result).toEqual({
      nextPaymentDate: '2026-08-15',
      currency: 'NGN',
      basePlanMinor: 18_900_000,
      taxRateBps: 333,
      taxMinor: 629_370, // floor(18_900_000 * 333 / 10000)
      totalMinor: 19_529_370,
      autoPay: true,
      paymentMethod: { brand: 'Visa', last4: '4242' },
    });
  });

  it('adds no tax when the market has no rate configured, and no card is null', async () => {
    const useCase = new GetUpcomingPaymentUseCase(
      subscriptionDirectory([SUB]),
      paymentDirectory([]),
      clock,
      taxConfig({}),
    );

    const result = await useCase.execute({ ownerId: 'owner-1', country: 'NG' });

    expect(result.taxRateBps).toBe(0);
    expect(result.taxMinor).toBe(0);
    expect(result.totalMinor).toBe(18_900_000);
    expect(result.paymentMethod).toBeNull();
  });

  it('404s when the owner has no active subscription', async () => {
    const useCase = new GetUpcomingPaymentUseCase(
      subscriptionDirectory([]),
      paymentDirectory([]),
      clock,
      taxConfig({ NG: 333 }),
    );

    await expect(useCase.execute({ ownerId: 'owner-1', country: 'NG' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
