import { ApiProperty } from '@nestjs/swagger';
import {
  AgingBucketResult,
  CollectionMethodShareResult,
  FinancialReportKpisResult,
  FinancialReportResult,
  MonthlyRevenuePointResult,
} from '../../application/dto/financial-report.result';
import { AgingBucket, ReportComparison } from '../../application/ports/financial-reports-read.port';

const AGING_BUCKETS: AgingBucket[] = ['CURRENT', 'DAYS_31_60', 'DAYS_61_90', 'DAYS_90_PLUS'];

class FinancialReportKpisDto implements FinancialReportKpisResult {
  @ApiProperty() totalRevenueMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) revenueDeltaPercent!: number | null;
  @ApiProperty() collectionsMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) collectionRatePercent!: number | null;
  @ApiProperty() outstandingMinor!: number;
  @ApiProperty() pendingInvoiceCount!: number;
  @ApiProperty() writeOffsMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) lossRatePercent!: number | null;
}

class MonthlyRevenuePointDto implements MonthlyRevenuePointResult {
  @ApiProperty({ description: 'First day of the month, ISO 8601' }) monthStart!: string;
  @ApiProperty() revenueMinor!: number;
}

class CollectionMethodShareDto implements CollectionMethodShareResult {
  @ApiProperty({ example: 'Bank Transfer' }) method!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ example: 62 }) sharePercent!: number;
}

class AgingBucketDto implements AgingBucketResult {
  @ApiProperty({ enum: AGING_BUCKETS }) bucket!: AgingBucket;
  @ApiProperty() invoiceCount!: number;
  @ApiProperty() totalMinor!: number;
  @ApiProperty() percent!: number;
}

/** The whole Financial Reports screen for one market. */
export class FinancialReportResponseDto implements FinancialReportResult {
  @ApiProperty() currency!: string;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ nullable: true, type: String }) branch!: string | null;
  @ApiProperty({ enum: ['PREVIOUS_PERIOD', 'PREVIOUS_YEAR'] }) comparison!: ReportComparison;
  @ApiProperty({ type: FinancialReportKpisDto }) kpis!: FinancialReportKpisDto;
  @ApiProperty({ type: [MonthlyRevenuePointDto] }) monthlyRevenue!: MonthlyRevenuePointDto[];
  @ApiProperty({ type: [CollectionMethodShareDto] })
  collectionsByMethod!: CollectionMethodShareDto[];
  @ApiProperty({ type: [AgingBucketDto] }) aging!: AgingBucketDto[];

  static fromResult(result: FinancialReportResult): FinancialReportResponseDto {
    return result;
  }
}
