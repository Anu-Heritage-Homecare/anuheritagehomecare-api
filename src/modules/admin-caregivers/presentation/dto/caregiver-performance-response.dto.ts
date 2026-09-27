import { ApiProperty } from '@nestjs/swagger';
import {
  CaregiverClientFeedbackResult,
  CaregiverKeyMetricsResult,
  CaregiverPerformanceHistoryRowResult,
  CaregiverPerformanceScoreCards,
  CaregiverPerformanceTabResult,
  CaregiverPerformanceTrendPointResult,
  CaregiverReviewResult,
} from '../../application/dto/caregiver-performance.result';

class ScoreCardsDto implements CaregiverPerformanceScoreCards {
  @ApiProperty({ nullable: true, type: Number }) overallScore!: number | null;
  @ApiProperty({ nullable: true, type: Number }) punctualityPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) clientSatisfaction!: number | null;
  @ApiProperty({ nullable: true, type: Number }) taskCompletionPercent!: number | null;
}

class OnTimeArrivalsDto {
  @ApiProperty() onTime!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ nullable: true, type: Number }) percent!: number | null;
}

class LateArrivalsDto {
  @ApiProperty() count!: number;
  @ApiProperty({ nullable: true, type: Number }) averageMinutesLate!: number | null;
}

class KeyMetricsDto implements CaregiverKeyMetricsResult {
  @ApiProperty() visitsCompleted!: number;
  @ApiProperty() hoursLogged!: number;
  @ApiProperty({ type: OnTimeArrivalsDto }) onTimeArrivals!: OnTimeArrivalsDto;
  @ApiProperty() missedVisits!: number;
  @ApiProperty({ type: LateArrivalsDto }) lateArrivals!: LateArrivalsDto;
  @ApiProperty() earlyDepartures!: number;
  @ApiProperty() overtimeHours!: number;
}

class ClientFeedbackDto implements CaregiverClientFeedbackResult {
  @ApiProperty({ nullable: true, type: Number }) averageRating!: number | null;
  @ApiProperty() totalReviews!: number;
  @ApiProperty() positiveReviews!: number;
  @ApiProperty() neutralReviews!: number;
  @ApiProperty() negativeReviews!: number;
  @ApiProperty({ type: [String] }) mostPraisedTraits!: string[];
  @ApiProperty({ type: [String] }) areasForGrowth!: string[];
}

class TrendPointDto implements CaregiverPerformanceTrendPointResult {
  @ApiProperty() monthLabel!: string;
  @ApiProperty({ nullable: true, type: Number }) score!: number | null;
}

class HistoryRowDto implements CaregiverPerformanceHistoryRowResult {
  @ApiProperty() monthLabel!: string;
  @ApiProperty({ nullable: true, type: Number }) score!: number | null;
  @ApiProperty() visits!: number;
  @ApiProperty() hours!: number;
  @ApiProperty({ nullable: true, type: Number }) punctualityPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) csat!: number | null;
}

class ReviewDto implements CaregiverReviewResult {
  @ApiProperty({ nullable: true, type: String }) authorName!: string | null;
  @ApiProperty({ nullable: true, type: String }) relationship!: string | null;
  @ApiProperty() reviewerType!: string;
  @ApiProperty() sentiment!: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  @ApiProperty() rating!: number;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ nullable: true, type: String }) recipientName!: string | null;
  @ApiProperty() createdAt!: string;
}

/** The caregiver Performance tab response. */
export class CaregiverPerformanceResponseDto implements CaregiverPerformanceTabResult {
  @ApiProperty() periodLabel!: string;
  @ApiProperty({ type: ScoreCardsDto }) scoreCards!: ScoreCardsDto;
  @ApiProperty({ type: KeyMetricsDto }) keyMetrics!: KeyMetricsDto;
  @ApiProperty({ type: ClientFeedbackDto }) clientFeedback!: ClientFeedbackDto;
  @ApiProperty({ type: [TrendPointDto] }) trend!: TrendPointDto[];
  @ApiProperty({ type: [HistoryRowDto] }) history!: HistoryRowDto[];
  @ApiProperty({ type: [ReviewDto] }) recentReviews!: ReviewDto[];

  static fromResult(result: CaregiverPerformanceTabResult): CaregiverPerformanceResponseDto {
    return result;
  }
}
