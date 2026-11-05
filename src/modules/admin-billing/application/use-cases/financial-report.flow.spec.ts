import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  FinancialReportFilter,
  FinancialReportView,
  FinancialReportsReadModel,
} from '../ports/financial-reports-read.port';
import { GetFinancialReportUseCase } from './get-financial-report.use-case';

const NOW = new Date('2026-11-01T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

function view(overrides: Partial<FinancialReportView> = {}): FinancialReportView {
  return {
    currency: 'NGN',
    kpis: {
      totalRevenueMinor: 45_000_000,
      previousRevenueMinor: 40_000_000,
      collectionsMinor: 38_000_000,
      outstandingMinor: 8_450_000,
      pendingInvoiceCount: 23,
      writeOffsMinor: 1_000_000,
    },
    monthlyRevenue: [{ monthStart: new Date('2026-06-01T00:00:00.000Z'), revenueMinor: 5_500_000 }],
    collectionsByMethod: [
      { method: 'Bank Transfer', amountMinor: 6_200 },
      { method: 'Card', amountMinor: 2_400 },
      { method: 'Cash', amountMinor: 800 },
      { method: 'Mobile Money', amountMinor: 600 },
    ],
    aging: [
      { bucket: 'CURRENT', invoiceCount: 142, totalMinor: 5_240_000 },
      { bucket: 'DAYS_31_60', invoiceCount: 48, totalMinor: 1_850_000 },
      { bucket: 'DAYS_61_90', invoiceCount: 21, totalMinor: 980_000 },
      { bucket: 'DAYS_90_PLUS', invoiceCount: 12, totalMinor: 380_000 },
    ],
    ...overrides,
  };
}

function reads(
  v: FinancialReportView,
  capture?: (filter: FinancialReportFilter) => void,
): FinancialReportsReadModel {
  return {
    report: (filter) => {
      capture?.(filter);
      return Promise.resolve(v);
    },
  };
}

describe('GetFinancialReportUseCase', () => {
  it('defaults to the last 30 days and the immediately preceding period', async () => {
    let captured: FinancialReportFilter | null = null;
    const result = await new GetFinancialReportUseCase(
      reads(view(), (f) => (captured = f)),
      clock,
    ).execute({
      currency: Currency.NigerianNaira,
      from: null,
      to: null,
      branch: null,
      comparison: 'PREVIOUS_PERIOD',
    });

    const f = captured as unknown as FinancialReportFilter;
    expect(f.to.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(f.from.toISOString()).toBe('2026-10-02T00:00:00.000Z');
    expect(f.previousTo.toISOString()).toBe('2026-10-02T00:00:00.000Z');
    expect(f.previousFrom.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(result.from).toBe('2026-10-02T00:00:00.000Z');
    expect(result.currency).toBe('NGN');
  });

  it('shifts the comparison window back a year for PREVIOUS_YEAR', async () => {
    let captured: FinancialReportFilter | null = null;
    await new GetFinancialReportUseCase(
      reads(view(), (f) => (captured = f)),
      clock,
    ).execute({
      currency: Currency.NigerianNaira,
      from: new Date('2026-06-01T00:00:00.000Z'),
      to: new Date('2026-07-01T00:00:00.000Z'),
      branch: 'Lagos',
      comparison: 'PREVIOUS_YEAR',
    });

    const f = captured as unknown as FinancialReportFilter;
    expect(f.previousFrom.toISOString()).toBe('2025-06-01T00:00:00.000Z');
    expect(f.previousTo.toISOString()).toBe('2025-07-01T00:00:00.000Z');
    expect(f.branch).toBe('Lagos');
  });

  it('derives the KPI deltas and rates', async () => {
    const result = await new GetFinancialReportUseCase(reads(view()), clock).execute({
      currency: Currency.NigerianNaira,
      from: null,
      to: null,
      branch: null,
      comparison: 'PREVIOUS_PERIOD',
    });

    expect(result.kpis.revenueDeltaPercent).toBe(12.5); // (45M - 40M) / 40M
    expect(result.kpis.collectionRatePercent).toBe(84.4); // 38M / 45M
    expect(result.kpis.lossRatePercent).toBe(2.2); // 1M / 45M
    expect(result.kpis.pendingInvoiceCount).toBe(23);
  });

  it('computes method shares and aging percentages that reflect the totals', async () => {
    const result = await new GetFinancialReportUseCase(reads(view()), clock).execute({
      currency: Currency.NigerianNaira,
      from: null,
      to: null,
      branch: null,
      comparison: 'PREVIOUS_PERIOD',
    });

    expect(result.collectionsByMethod.map((m) => m.sharePercent)).toEqual([62, 24, 8, 6]);
    expect(result.aging.find((a) => a.bucket === 'CURRENT')?.percent).toBe(62);
    expect(result.monthlyRevenue[0].monthStart).toBe('2026-06-01T00:00:00.000Z');
  });

  it('returns null rates when there was no revenue to divide by', async () => {
    const result = await new GetFinancialReportUseCase(
      reads(
        view({
          kpis: {
            totalRevenueMinor: 0,
            previousRevenueMinor: 0,
            collectionsMinor: 0,
            outstandingMinor: 0,
            pendingInvoiceCount: 0,
            writeOffsMinor: 0,
          },
        }),
      ),
      clock,
    ).execute({
      currency: Currency.NigerianNaira,
      from: null,
      to: null,
      branch: null,
      comparison: 'PREVIOUS_PERIOD',
    });

    expect(result.kpis.revenueDeltaPercent).toBeNull();
    expect(result.kpis.collectionRatePercent).toBeNull();
    expect(result.kpis.lossRatePercent).toBeNull();
  });
});
