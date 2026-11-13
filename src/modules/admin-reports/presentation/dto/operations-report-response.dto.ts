import { ApiProperty } from '@nestjs/swagger';
import {
  CancellationReasonResult,
  DailyTrendPointResult,
  LocationPerformanceResult,
  LocationTrend,
  OperationsReportResult,
  ServiceTypeResult,
  VisitPerformanceResult,
  WeeklyCompletionResult,
} from '../../application/dto/operations-report.result';

class VisitPerformanceDto implements VisitPerformanceResult {
  @ApiProperty() totalVisits!: number;
  @ApiProperty({ nullable: true, type: Number }) totalVisitsDeltaPercent!: number | null;
  @ApiProperty() completed!: number;
  @ApiProperty({ nullable: true, type: Number }) completedPercent!: number | null;
  @ApiProperty() cancelled!: number;
  @ApiProperty({ nullable: true, type: Number }) cancelledPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) avgVisitDurationMinutes!: number | null;
}

class DailyTrendPointDto implements DailyTrendPointResult {
  @ApiProperty({ example: '2026-10-01' }) date!: string;
  @ApiProperty() visits!: number;
}

class WeeklyCompletionDto implements WeeklyCompletionResult {
  @ApiProperty({ example: 'W1' }) label!: string;
  @ApiProperty({ nullable: true, type: Number }) completionPercent!: number | null;
}

class CancellationReasonDto implements CancellationReasonResult {
  @ApiProperty({ example: 'CLIENT_REQUEST' }) reason!: string;
  @ApiProperty() count!: number;
  @ApiProperty() percent!: number;
}

class ServiceTypeDto implements ServiceTypeResult {
  @ApiProperty({ example: 'PERSONAL_CARE' }) type!: string;
  @ApiProperty() count!: number;
}

class LocationPerformanceDto implements LocationPerformanceResult {
  @ApiProperty() location!: string;
  @ApiProperty() totalVisits!: number;
  @ApiProperty({ nullable: true, type: Number }) completionPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) avgVisitDurationMinutes!: number | null;
  @ApiProperty({ nullable: true, type: Number }) satisfactionAvg!: number | null;
  @ApiProperty({ enum: ['UP', 'FLAT', 'DOWN'] }) trend!: LocationTrend;
}

/** The whole Operations Report drill down. */
export class OperationsReportResponseDto implements OperationsReportResult {
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ type: VisitPerformanceDto }) visitPerformance!: VisitPerformanceDto;
  @ApiProperty({ type: [DailyTrendPointDto] }) dailyTrend!: DailyTrendPointDto[];
  @ApiProperty({ type: [WeeklyCompletionDto] }) weeklyCompletion!: WeeklyCompletionDto[];
  @ApiProperty({ type: [CancellationReasonDto] }) cancellationReasons!: CancellationReasonDto[];
  @ApiProperty({ type: [ServiceTypeDto] }) topServiceTypes!: ServiceTypeDto[];
  @ApiProperty({ type: [LocationPerformanceDto] }) locationPerformance!: LocationPerformanceDto[];

  static fromResult(result: OperationsReportResult): OperationsReportResponseDto {
    return result;
  }
}
