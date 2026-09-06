import { ApiProperty } from '@nestjs/swagger';
import { AlertResponseDto } from '@modules/admin-alerts/presentation/dto/alert-response.dto';
import { DashboardResult } from '../../application/dto/dashboard.result';

class OperationsSnapshotDto {
  @ApiProperty() activeHomeVisits!: number;
  @ApiProperty() scheduledToday!: number;
  @ApiProperty() scheduledCompletionPercent!: number;
  @ApiProperty() availableCaregivers!: number;
  @ApiProperty() totalCaregivers!: number;
  @ApiProperty() visitsStartingSoon!: number;
  @ApiProperty() criticalAlerts!: number;
  @ApiProperty({ nullable: true }) careQualityScore!: number | null;
}

class ScheduleItemDto {
  @ApiProperty() visitId!: string;
  @ApiProperty() startMinute!: number;
  @ApiProperty() endMinute!: number;
  @ApiProperty() recipientName!: string;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
  @ApiProperty() visitType!: string;
  @ApiProperty() status!: string;
  @ApiProperty() priority!: string;
}

class ActivityItemDto {
  @ApiProperty() type!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: String, format: 'date-time' }) occurredAt!: string;
}

class PerformanceSnapshotDto {
  @ApiProperty() completionRatePercent!: number;
  @ApiProperty({ nullable: true }) averageArrivalDeltaMinutes!: number | null;
  @ApiProperty({ nullable: true }) clientSatisfaction!: number | null;
  @ApiProperty() clientSatisfactionCount!: number;
  @ApiProperty() openTasks!: number;
  @ApiProperty({ nullable: true }) revenueTodayMinor!: number | null;
}

export class DashboardResponseDto {
  @ApiProperty({ type: OperationsSnapshotDto })
  operations!: OperationsSnapshotDto;

  @ApiProperty({ type: [ScheduleItemDto] })
  todaysSchedule!: ScheduleItemDto[];

  @ApiProperty({ type: [AlertResponseDto] })
  criticalAlerts!: AlertResponseDto[];

  @ApiProperty({ type: [ActivityItemDto] })
  activityTimeline!: ActivityItemDto[];

  @ApiProperty({ type: PerformanceSnapshotDto })
  performance!: PerformanceSnapshotDto;

  static fromResult(result: DashboardResult): DashboardResponseDto {
    const dto = new DashboardResponseDto();
    dto.operations = { ...result.operations };
    dto.todaysSchedule = result.todaysSchedule.map((item) => ({ ...item }));
    dto.criticalAlerts = result.criticalAlerts.map((alert) => AlertResponseDto.fromResult(alert));
    dto.activityTimeline = result.activityTimeline.map((item) => ({
      type: item.type,
      description: item.description,
      occurredAt: item.occurredAt.toISOString(),
    }));
    dto.performance = { ...result.performance };
    return dto;
  }
}
