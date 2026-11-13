import { ApiProperty } from '@nestjs/swagger';
import {
  AttendancePointResult,
  CertificationUrgency,
  ExpiringCertificationResult,
  FlaggedCaregiverResult,
  RatingBand,
  RatingDistributionResult,
  TopCaregiverResult,
  TrainingComplianceResult,
  WeeklyUtilizationResult,
  WorkforceKpisResult,
  WorkforceReportResult,
} from '../../application/dto/workforce-report.result';

class WorkforceKpisDto implements WorkforceKpisResult {
  @ApiProperty() activeCaregivers!: number;
  @ApiProperty({ nullable: true, type: Number }) staffedPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) utilizationPercent!: number | null;
  @ApiProperty({ example: 85 }) utilizationTargetPercent!: number;
  @ApiProperty({ nullable: true, type: Number }) attendancePercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) avgPerformance!: number | null;
  @ApiProperty({ nullable: true, type: Number }) trainingCompliancePercent!: number | null;
}

class WeeklyUtilizationDto implements WeeklyUtilizationResult {
  @ApiProperty({ example: 'Week 1' }) label!: string;
  @ApiProperty({ nullable: true, type: Number }) utilizationPercent!: number | null;
}

class AttendancePointDto implements AttendancePointResult {
  @ApiProperty({ example: '2026-10-01' }) date!: string;
  @ApiProperty({ nullable: true, type: Number }) attendancePercent!: number | null;
}

class RatingDistributionDto implements RatingDistributionResult {
  @ApiProperty({ enum: ['OUTSTANDING', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT'] })
  band!: RatingBand;
  @ApiProperty() caregivers!: number;
  @ApiProperty() percent!: number;
}

class TopCaregiverDto implements TopCaregiverResult {
  @ApiProperty() rank!: number;
  @ApiProperty() caregiverId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) photoKey!: string | null;
  @ApiProperty({ nullable: true, type: Number }) rating!: number | null;
  @ApiProperty() visitsCompleted!: number;
  @ApiProperty({ nullable: true, type: Number }) onTimeRatePercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) attendancePercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) csatScore!: number | null;
}

class TrainingComplianceDto implements TrainingComplianceResult {
  @ApiProperty() compliant!: number;
  @ApiProperty() overdue!: number;
  @ApiProperty({ nullable: true, type: Number }) compliantPercent!: number | null;
}

class ExpiringCertificationDto implements ExpiringCertificationResult {
  @ApiProperty() caregiverId!: string;
  @ApiProperty() caregiverName!: string;
  @ApiProperty({ example: 'CNA State License' }) credentialName!: string;
  @ApiProperty() expiresAt!: string;
  @ApiProperty() daysUntilExpiry!: number;
  @ApiProperty({ enum: ['ACTION_REQUIRED', 'GRACE_PERIOD', 'SCHEDULED'] })
  status!: CertificationUrgency;
}

class FlaggedCaregiverDto implements FlaggedCaregiverResult {
  @ApiProperty() caregiverId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) photoKey!: string | null;
  @ApiProperty() reason!: string;
  @ApiProperty({ nullable: true, type: Number }) attendancePercent!: number | null;
  @ApiProperty() lateArrivals!: number;
}

/** The whole Workforce Report drill down. */
export class WorkforceReportResponseDto implements WorkforceReportResult {
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ type: WorkforceKpisDto }) kpis!: WorkforceKpisDto;
  @ApiProperty({ type: [WeeklyUtilizationDto] }) weeklyUtilization!: WeeklyUtilizationDto[];
  @ApiProperty({ type: [AttendancePointDto] }) attendanceTrend!: AttendancePointDto[];
  @ApiProperty({ type: [RatingDistributionDto] }) ratingDistribution!: RatingDistributionDto[];
  @ApiProperty({ type: [TopCaregiverDto] }) topCaregivers!: TopCaregiverDto[];
  @ApiProperty({ type: TrainingComplianceDto }) trainingCompliance!: TrainingComplianceDto;
  @ApiProperty({ type: [ExpiringCertificationDto] })
  expiringCertifications!: ExpiringCertificationDto[];
  @ApiProperty({ type: [FlaggedCaregiverDto] }) flaggedForReview!: FlaggedCaregiverDto[];

  static fromResult(result: WorkforceReportResult): WorkforceReportResponseDto {
    return result;
  }
}
