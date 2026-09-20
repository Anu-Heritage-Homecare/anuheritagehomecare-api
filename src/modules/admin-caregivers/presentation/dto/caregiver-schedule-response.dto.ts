import { ApiProperty } from '@nestjs/swagger';
import {
  CaregiverAvailabilitySettingDayResult,
  CaregiverScheduleDayResult,
  CaregiverScheduleDayVisitResult,
  CaregiverScheduleResult,
  CaregiverScheduleVisitResult,
} from '../../application/dto/caregiver-schedule.result';

class ScheduleSummaryDto {
  @ApiProperty() hoursScheduled!: number;
  @ApiProperty({ nullable: true, type: Number }) targetHours!: number | null;
  @ApiProperty({ nullable: true, type: Number }) loadPercent!: number | null;
  @ApiProperty() visitsScheduled!: number;
  @ApiProperty() allConfirmed!: boolean;
  @ApiProperty({ nullable: true, type: String }) availabilityDayRange!: string | null;
  @ApiProperty({ nullable: true, type: String }) standardWindow!: string | null;
}

class ScheduleDayVisitDto implements CaregiverScheduleDayVisitResult {
  @ApiProperty() time!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty() visitType!: string;
  @ApiProperty() status!: string;
}

class ScheduleDayDto implements CaregiverScheduleDayResult {
  @ApiProperty() dayLabel!: string;
  @ApiProperty() date!: string;
  @ApiProperty() offDuty!: boolean;
  @ApiProperty({ type: [ScheduleDayVisitDto] }) visits!: ScheduleDayVisitDto[];
}

class UpcomingVisitDto implements CaregiverScheduleVisitResult {
  @ApiProperty() date!: string;
  @ApiProperty() time!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty() visitType!: string;
  @ApiProperty() durationHours!: number;
  @ApiProperty() status!: string;
}

class AvailabilitySettingDayDto implements CaregiverAvailabilitySettingDayResult {
  @ApiProperty() dayLabel!: string;
  @ApiProperty() available!: boolean;
  @ApiProperty({ nullable: true, type: String }) window!: string | null;
}

class AvailabilitySettingsDto {
  @ApiProperty({ type: [AvailabilitySettingDayDto] }) days!: AvailabilitySettingDayDto[];
  @ApiProperty({ nullable: true, type: Number }) maxHoursPerWeek!: number | null;
  @ApiProperty({ nullable: true, type: String }) preferredShift!: string | null;
  @ApiProperty() overtimeEligible!: boolean;
  @ApiProperty({ nullable: true, type: Number }) overtimeRate!: number | null;
}

/** The caregiver Schedule tab response. */
export class CaregiverScheduleResponseDto implements CaregiverScheduleResult {
  @ApiProperty() weekStart!: string;
  @ApiProperty() weekEnd!: string;
  @ApiProperty({ type: ScheduleSummaryDto }) summary!: ScheduleSummaryDto;
  @ApiProperty({ type: [ScheduleDayDto] }) days!: ScheduleDayDto[];
  @ApiProperty({ type: [UpcomingVisitDto] }) upcomingVisits!: UpcomingVisitDto[];
  @ApiProperty({ type: AvailabilitySettingsDto }) availabilitySettings!: AvailabilitySettingsDto;

  static fromResult(result: CaregiverScheduleResult): CaregiverScheduleResponseDto {
    return result;
  }
}
