import { AgingBucket } from '../../application/ports/financial-reports-read.port';
import { FinancialReportResult } from '../../application/dto/financial-report.result';

export const AGING_LABEL: Record<AgingBucket, string> = {
  CURRENT: 'Current (0-30 days)',
  DAYS_31_60: '31-60 days',
  DAYS_61_90: '61-90 days',
  DAYS_90_PLUS: '90+ days',
};

/** A date range window label, e.g. "1 Jan 2026 to 30 Jun 2026". */
export function periodLabel(report: FinancialReportResult): string {
  return `${report.from.slice(0, 10)} to ${report.to.slice(0, 10)}`;
}

/** The report's KPI rows as [label, amount minor, note] for a shared layout. */
export function kpiRows(
  report: FinancialReportResult,
): { label: string; amountMinor: number; note: string }[] {
  const k = report.kpis;
  const pct = (value: number | null): string => (value === null ? '-' : `${value}%`);
  return [
    {
      label: 'Total Revenue',
      amountMinor: k.totalRevenueMinor,
      note: `${pct(k.revenueDeltaPercent)} vs comparison`,
    },
    {
      label: 'Collections',
      amountMinor: k.collectionsMinor,
      note: `${pct(k.collectionRatePercent)} collection rate`,
    },
    {
      label: 'Outstanding Balance',
      amountMinor: k.outstandingMinor,
      note: `${k.pendingInvoiceCount} invoices pending`,
    },
    {
      label: 'Write-offs',
      amountMinor: k.writeOffsMinor,
      note: `${pct(k.lossRatePercent)} loss rate`,
    },
  ];
}
