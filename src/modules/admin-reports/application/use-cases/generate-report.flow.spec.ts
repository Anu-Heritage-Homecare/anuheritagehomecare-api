import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { Currency } from '@shared/domain/currency.enum';
import { GeneratedReport } from '../../domain/generated-report.entity';
import { GeneratedReportRepository } from '../../domain/generated-report.repository';
import { ReportFormat, ReportType } from '../../domain/report-kind';
import { GenerateReportUseCase } from './generate-report.use-case';

const NOW = new Date('2026-11-08T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const ids: IdGenerator = { generate: () => 'report-1' };

function repo(): GeneratedReportRepository & { saved: GeneratedReport[] } {
  const saved: GeneratedReport[] = [];
  return {
    saved,
    save: (report) => {
      saved.push(report);
      return Promise.resolve();
    },
    listRecent: () => Promise.resolve([]),
  };
}

describe('GenerateReportUseCase', () => {
  it('records a report with the derived title and returns it', async () => {
    const reports = repo();
    const result = await new GenerateReportUseCase(reports, ids, clock).execute({
      type: ReportType.Operations,
      format: ReportFormat.Pdf,
      currency: Currency.NigerianNaira,
      from: null,
      to: null,
      adminId: 'admin-3',
    });
    expect(result).toMatchObject({
      id: 'report-1',
      type: 'OPERATIONS',
      title: 'Operations Report',
      format: 'PDF',
      generatedAt: NOW.toISOString(),
    });
    expect(reports.saved).toHaveLength(1);
    expect(reports.saved[0].generatedById).toBe('admin-3');
  });

  it('rejects a period whose end is before its start', async () => {
    await expect(
      new GenerateReportUseCase(repo(), ids, clock).execute({
        type: ReportType.FinancialSummary,
        format: ReportFormat.Excel,
        currency: Currency.UnitedStatesDollar,
        from: new Date('2026-11-08T00:00:00.000Z'),
        to: new Date('2026-10-08T00:00:00.000Z'),
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
