import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency } from '@shared/domain/currency.enum';
import { GeneratedReport } from '../../domain/generated-report.entity';
import {
  GENERATED_REPORT_REPOSITORY,
  GeneratedReportRepository,
} from '../../domain/generated-report.repository';
import { ReportFormat, ReportType } from '../../domain/report-kind';

const DEFAULT_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GenerateReportCommand {
  type: ReportType;
  format: ReportFormat;
  currency: Currency;
  from: Date | null;
  to: Date | null;
  adminId: string;
}

export interface GenerateReportResult {
  id: string;
  type: string;
  title: string;
  format: string;
  generatedAt: string;
}

/**
 * Record a report produced from the Reports screen (the Generate Report action). Only
 * the metadata is persisted so the report appears in the Recent Report Activity feed;
 * the artifact is streamed on demand through the export endpoints.
 */
@Injectable()
export class GenerateReportUseCase {
  constructor(
    @Inject(GENERATED_REPORT_REPOSITORY) private readonly reports: GeneratedReportRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GenerateReportCommand): Promise<GenerateReportResult> {
    const now = this.clock.now();
    const to = command.to ?? now;
    const from = command.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

    const report = GeneratedReport.generate({
      id: this.ids.generate(),
      type: command.type,
      format: command.format,
      currency: command.currency,
      periodStart: from,
      periodEnd: to,
      generatedById: command.adminId,
      now,
    });
    await this.reports.save(report);

    return {
      id: report.id,
      type: report.type,
      title: report.title,
      format: report.format,
      generatedAt: report.createdAt.toISOString(),
    };
  }
}
