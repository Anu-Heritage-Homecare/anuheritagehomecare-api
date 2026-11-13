import { GeneratedReport } from './generated-report.entity';

/** One entry of the Recent Report Activity feed, with the generator's display label. */
export interface ReportActivityRow {
  id: string;
  type: string;
  title: string;
  format: string;
  generatedAt: Date;
  /** The generator's role label ("By Operations Manager"), null when unresolved. */
  generatedByLabel: string | null;
}

/** Persistence port for the Reports screen report activity feed. */
export interface GeneratedReportRepository {
  save(report: GeneratedReport): Promise<void>;
  /** The most recent reports, newest first, resolved to a feed row. */
  listRecent(limit: number): Promise<ReportActivityRow[]>;
}

export const GENERATED_REPORT_REPOSITORY = Symbol('GENERATED_REPORT_REPOSITORY');
