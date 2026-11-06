import { FinancialReportResult } from '../../application/dto/financial-report.result';
import { buildFinancialReportPdf } from './financial-report-pdf';
import { buildFinancialReportXlsx } from './financial-report-xlsx';

function report(): FinancialReportResult {
  return {
    currency: 'NGN',
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-31T00:00:00.000Z',
    branch: null,
    comparison: 'PREVIOUS_PERIOD',
    kpis: {
      totalRevenueMinor: 4_523_000_000,
      revenueDeltaPercent: 12,
      collectionsMinor: 3_871_000_000,
      collectionRatePercent: 94.2,
      outstandingMinor: 845_000_000,
      pendingInvoiceCount: 23,
      writeOffsMinor: 120_000_000,
      lossRatePercent: 2.1,
    },
    monthlyRevenue: [{ monthStart: '2026-06-01T00:00:00.000Z', revenueMinor: 880_000_000 }],
    collectionsByMethod: [
      { method: 'Bank Transfer', amountMinor: 2_400_000_000, sharePercent: 62 },
    ],
    aging: [{ bucket: 'CURRENT', invoiceCount: 142, totalMinor: 524_000_000, percent: 62.4 }],
  };
}

describe('buildFinancialReportPdf', () => {
  it('produces a well formed PDF with the KPI figures', () => {
    const { filename, pdf } = buildFinancialReportPdf(report());
    expect(filename).toBe('financial-report-2026-08-01.pdf');
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('FINANCIAL REPORT');
    expect(text).toContain('NGN 45,230,000.00');
  });
});

describe('buildFinancialReportXlsx', () => {
  it('produces an xlsx with the report sections and numeric amounts', () => {
    const { filename, xlsx } = buildFinancialReportXlsx(report());
    expect(filename).toBe('financial-report-2026-08-01.xlsx');
    const text = xlsx.toString('latin1');
    expect(text.slice(0, 2)).toBe('PK');
    expect(text).toContain('Total Revenue');
    expect(text).toContain('Aging Period');
    // Amounts are numeric major units so the sheet can sum them.
    expect(text).toContain('<v>45230000</v>');
  });
});
