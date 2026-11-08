import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { Currency } from '@shared/domain/currency.enum';
import { ReportFormat, ReportType, REPORT_TYPE_TITLE } from './report-kind';

const MAX_TITLE_LENGTH = 200;

interface GeneratedReportProps {
  type: ReportType;
  title: string;
  format: ReportFormat;
  currency: Currency;
  periodStart: Date;
  periodEnd: Date;
  generatedById: string | null;
  createdAt: Date;
}

/**
 * GeneratedReport aggregate: one entry in the Recent Report Activity feed, produced
 * by the Generate Report action. Holds only the metadata (kind, format, the market
 * and period it covered, and who generated it); the artifact is streamed on demand
 * from the live aggregates and never stored.
 */
export class GeneratedReport extends AggregateRoot<string> {
  private props: GeneratedReportProps;

  private constructor(id: string, props: GeneratedReportProps) {
    super(id);
    this.props = props;
  }

  public static generate(params: {
    id: string;
    type: ReportType;
    format: ReportFormat;
    currency: Currency;
    periodStart: Date;
    periodEnd: Date;
    generatedById: string | null;
    now: Date;
  }): GeneratedReport {
    if (params.periodEnd.getTime() < params.periodStart.getTime()) {
      throw new ValidationException('The report period end is before its start');
    }
    return new GeneratedReport(params.id, {
      type: params.type,
      title: REPORT_TYPE_TITLE[params.type].slice(0, MAX_TITLE_LENGTH),
      format: params.format,
      currency: params.currency,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      generatedById: params.generatedById,
      createdAt: params.now,
    });
  }

  public get type(): ReportType {
    return this.props.type;
  }

  public get title(): string {
    return this.props.title;
  }

  public get format(): ReportFormat {
    return this.props.format;
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get periodStart(): Date {
    return this.props.periodStart;
  }

  public get periodEnd(): Date {
    return this.props.periodEnd;
  }

  public get generatedById(): string | null {
    return this.props.generatedById;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
}
