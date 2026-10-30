import { Currency as PrismaCurrency } from '@prisma/client';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  BillingDashboardReadModel,
  BillingDashboardView,
} from '../ports/billing-dashboard-read.port';
import { GetBillingDashboardUseCase } from './get-billing-dashboard.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');

function baseView(overrides: Partial<BillingDashboardView> = {}): BillingDashboardView {
  return {
    collectedLifetimeMinor: 4_523_000_000,
    paymentsThisMonthMinor: 1_265_000_000,
    paymentsThisMonthCount: 47,
    paymentsLastMonthMinor: 1_000_000_000,
    billedLifetimeMinor: 5_000_000_000,
    billedThisMonthMinor: 1_300_000_000,
    collectedThisMonthMinor: 1_265_000_000,
    billedLastMonthMinor: 1_100_000_000,
    collectedLastMonthMinor: 1_000_000_000,
    outstanding: { patientDueMinor: 845_000_000, invoiceCount: 23 },
    overdue: { patientDueMinor: 218_000_000, invoiceCount: 8 },
    aging: {
      days0to30Minor: 320_000_000,
      days31to60Minor: 285_000_000,
      days61to90Minor: 140_000_000,
      days90PlusMinor: 100_000_000,
    },
    revenueSeries: [
      { monthStart: new Date(Date.UTC(2026, 1, 1)), totalMinor: 2_500_000_000 },
      { monthStart: new Date(Date.UTC(2026, 6, 1)), totalMinor: 4_500_000_000 },
    ],
    recentPayments: [
      {
        sequence: 4890,
        accountName: 'Adeyemi Family Care',
        amountMinor: 45_000_000,
        methodLabel: 'Bank Transfer',
        receivedAt: new Date('2026-07-24T08:00:00.000Z'),
      },
    ],
    recentInvoices: [
      {
        sequence: 92,
        issuedAt: new Date('2026-07-24T07:00:00.000Z'),
        accountName: 'Okafor Care',
      },
    ],
    overdueInvoices: [
      {
        sequence: 54,
        issuedAt: new Date('2026-06-01T00:00:00.000Z'),
        dueDate: new Date('2026-06-24T00:00:00.000Z'),
        accountName: 'Bello Trust',
      },
    ],
    ...overrides,
  };
}

function makeUseCase(view: BillingDashboardView): {
  useCase: GetBillingDashboardUseCase;
  dashboard: jest.Mock;
} {
  const dashboard = jest.fn().mockResolvedValue(view);
  const reads: BillingDashboardReadModel = { dashboard };
  const clock: Clock = { now: () => NOW };
  return { useCase: new GetBillingDashboardUseCase(reads, clock), dashboard };
}

describe('GetBillingDashboardUseCase', () => {
  it('maps the KPI cards and derives revenue growth month over month', async () => {
    const { useCase } = makeUseCase(baseView());

    const result = await useCase.execute({ currency: Currency.NigerianNaira });

    expect(result.currency).toBe('NGN');
    expect(result.generatedAt).toBe(NOW.toISOString());
    expect(result.kpis.totalRevenueMinor).toBe(4_523_000_000);
    expect(result.kpis.outstandingBalanceMinor).toBe(845_000_000);
    expect(result.kpis.outstandingInvoiceCount).toBe(23);
    expect(result.kpis.overdueAmountMinor).toBe(218_000_000);
    expect(result.kpis.overdueInvoiceCount).toBe(8);
    expect(result.kpis.paymentsThisMonthMinor).toBe(1_265_000_000);
    expect(result.kpis.paymentsThisMonthCount).toBe(47);
    // (1,265,000,000 - 1,000,000,000) / 1,000,000,000 = 26.5%
    expect(result.kpis.totalRevenueGrowthPercent).toBe(26.5);
  });

  it('computes the collection rate as collected over billed, capped at 100', async () => {
    const { useCase } = makeUseCase(baseView());

    const result = await useCase.execute({ currency: Currency.NigerianNaira });

    // 4,523,000,000 / 5,000,000,000 = 90.46% -> 90.5
    expect(result.kpis.collectionRatePercent).toBe(90.5);
    // this month 1.265e9/1.3e9 = 97.3; last month 1e9/1.1e9 = 90.9; delta 6.4
    expect(result.kpis.collectionRateDeltaPercent).toBe(6.4);
  });

  it('never reports a collection rate above 100 even with overpayment', async () => {
    const { useCase } = makeUseCase(
      baseView({ collectedLifetimeMinor: 6_000_000_000, billedLifetimeMinor: 5_000_000_000 }),
    );

    const result = await useCase.execute({ currency: Currency.NigerianNaira });

    expect(result.kpis.collectionRatePercent).toBe(100);
  });

  it('returns a null collection rate and growth when the bases are zero', async () => {
    const { useCase } = makeUseCase(
      baseView({
        billedLifetimeMinor: 0,
        billedThisMonthMinor: 0,
        billedLastMonthMinor: 0,
        paymentsLastMonthMinor: 0,
      }),
    );

    const result = await useCase.execute({ currency: Currency.NigerianNaira });

    expect(result.kpis.collectionRatePercent).toBeNull();
    expect(result.kpis.collectionRateDeltaPercent).toBeNull();
    expect(result.kpis.totalRevenueGrowthPercent).toBeNull();
  });

  it('formats the payment reference as a padded TXN number and labels the month trend', async () => {
    const { useCase } = makeUseCase(baseView());

    const result = await useCase.execute({ currency: Currency.NigerianNaira });

    expect(result.recentPayments[0].reference).toBe('TXN-4890');
    expect(result.recentPayments[0].account).toBe('Adeyemi Family Care');
    expect(result.recentPayments[0].methodLabel).toBe('Bank Transfer');
    expect(result.revenueSeries).toEqual([
      {
        label: 'Feb 2026',
        monthStart: new Date(Date.UTC(2026, 1, 1)).toISOString(),
        totalMinor: 2_500_000_000,
      },
      {
        label: 'Jul 2026',
        monthStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
        totalMinor: 4_500_000_000,
      },
    ]);
    expect(result.outstandingAging.days0to30Minor).toBe(320_000_000);
    expect(result.outstandingAging.days90PlusMinor).toBe(100_000_000);
  });

  it('merges the activity streams newest first with structured fields', async () => {
    const { useCase } = makeUseCase(baseView());

    const result = await useCase.execute({ currency: Currency.NigerianNaira });

    expect(result.recentActivity.map((entry) => entry.type)).toEqual([
      'PAYMENT_RECEIVED', // 08:00
      'INVOICE_CREATED', // 07:00
      'INVOICE_OVERDUE', // 2026-06-24
    ]);
    const payment = result.recentActivity[0];
    expect(payment.title).toBe('Payment Received');
    expect(payment.amountMinor).toBe(45_000_000);
    expect(payment.invoiceNumber).toBeNull();

    const created = result.recentActivity[1];
    expect(created.invoiceNumber).toBe('INV-2026-092');

    const overdue = result.recentActivity[2];
    expect(overdue.invoiceNumber).toBe('INV-2026-054');
    expect(overdue.daysPastDue).toBe(30); // 2026-06-24 to 2026-07-24
  });

  it('scopes the read to the requested market currency', async () => {
    const { useCase, dashboard } = makeUseCase(baseView());

    await useCase.execute({ currency: Currency.UnitedStatesDollar });

    expect(dashboard).toHaveBeenCalledWith(PrismaCurrency.USD, NOW, 6, 8);
  });
});
