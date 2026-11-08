import { ApiProperty } from '@nestjs/swagger';
import {
  FinancialSummaryResult,
  MonthlyPerformanceResult,
  MonthlyRevenueResult,
  OperationalPerformanceResult,
  ReportActivityResult,
  ReportsKpisResult,
  ReportsOverviewResult,
  RevenueOverviewResult,
  SatisfactionBreakdownResult,
  WorkforceSummaryResult,
} from '../../application/dto/reports-overview.result';

class ReportsKpisDto implements ReportsKpisResult {
  @ApiProperty() totalVisits!: number;
  @ApiProperty({ nullable: true, type: Number }) caregiverUtilizationPercent!: number | null;
  @ApiProperty({ description: 'Collected revenue in the range, minor units' })
  revenueMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) clientSatisfactionAvg!: number | null;
  @ApiProperty({ nullable: true, type: Number }) visitCompletionPercent!: number | null;
  @ApiProperty() outstandingMinor!: number;
}

class MonthlyPerformanceDto implements MonthlyPerformanceResult {
  @ApiProperty() monthStart!: string;
  @ApiProperty({ nullable: true, type: Number }) completionPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) utilizationPercent!: number | null;
}

class MonthlyRevenueDto implements MonthlyRevenueResult {
  @ApiProperty() monthStart!: string;
  @ApiProperty() revenueMinor!: number;
}

class RevenueOverviewDto implements RevenueOverviewResult {
  @ApiProperty() ytdRevenueMinor!: number;
  @ApiProperty({ type: [MonthlyRevenueDto] }) monthly!: MonthlyRevenueDto[];
}

class OperationalPerformanceDto implements OperationalPerformanceResult {
  @ApiProperty() visitsThisMonth!: number;
  @ApiProperty({ nullable: true, type: Number }) avgVisitDurationMinutes!: number | null;
  @ApiProperty({ nullable: true, type: Number }) onTimeRatePercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) cancellationRatePercent!: number | null;
}

class WorkforceSummaryDto implements WorkforceSummaryResult {
  @ApiProperty() activeCaregivers!: number;
  @ApiProperty({ nullable: true, type: Number }) avgRating!: number | null;
  @ApiProperty({ nullable: true, type: Number }) trainingCompliancePercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) attendanceRatePercent!: number | null;
}

class FinancialSummaryDto implements FinancialSummaryResult {
  @ApiProperty() monthlyRevenueMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) collectionRatePercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) avgInvoiceMinor!: number | null;
  @ApiProperty() outstandingMinor!: number;
}

class SatisfactionBreakdownDto implements SatisfactionBreakdownResult {
  @ApiProperty({ example: 5 }) score!: number;
  @ApiProperty() count!: number;
  @ApiProperty() percent!: number;
}

class ReportActivityDto implements ReportActivityResult {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ example: 'Operations Report' }) title!: string;
  @ApiProperty() format!: string;
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ nullable: true, type: String }) generatedByLabel!: string | null;
}

/** The whole Reports Overview screen in one read. */
export class ReportsOverviewResponseDto implements ReportsOverviewResult {
  @ApiProperty({ example: 'NGN' }) currency!: string;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ type: ReportsKpisDto }) kpis!: ReportsKpisDto;
  @ApiProperty({ type: [MonthlyPerformanceDto] }) monthlyPerformance!: MonthlyPerformanceDto[];
  @ApiProperty({ type: RevenueOverviewDto }) revenueOverview!: RevenueOverviewDto;
  @ApiProperty({ type: OperationalPerformanceDto })
  operationalPerformance!: OperationalPerformanceDto;
  @ApiProperty({ type: WorkforceSummaryDto }) workforceSummary!: WorkforceSummaryDto;
  @ApiProperty({ type: FinancialSummaryDto }) financialSummary!: FinancialSummaryDto;
  @ApiProperty({ type: [SatisfactionBreakdownDto] })
  satisfactionBreakdown!: SatisfactionBreakdownDto[];
  @ApiProperty({ type: [ReportActivityDto] }) recentReports!: ReportActivityDto[];

  static fromResult(result: ReportsOverviewResult): ReportsOverviewResponseDto {
    return result;
  }
}
