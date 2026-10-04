import { ApiProperty } from '@nestjs/swagger';
import {
  BusinessHourDayResult,
  DefaultDurationResult,
  HolidayResult,
  SchedulingRulesResult,
  SchedulingSettingsResult,
  TravelSettingsResult,
} from '../../application/dto/scheduling-settings.result';

class BusinessHourDayDto implements BusinessHourDayResult {
  @ApiProperty() weekday!: string;
  @ApiProperty() weekdayLabel!: string;
  @ApiProperty() open!: boolean;
  @ApiProperty() openMinute!: number;
  @ApiProperty() closeMinute!: number;
  @ApiProperty() openLabel!: string;
  @ApiProperty() closeLabel!: string;
}

class DefaultDurationDto implements DefaultDurationResult {
  @ApiProperty() visitType!: string;
  @ApiProperty() label!: string;
  @ApiProperty() minutes!: number;
}

class RulesDto implements SchedulingRulesResult {
  @ApiProperty() requireCertificationMatch!: boolean;
  @ApiProperty() autoAssignPreferredCaregiver!: boolean;
  @ApiProperty() allowOvertimeScheduling!: boolean;
  @ApiProperty() requireCoordinatorApprovalForUrgent!: boolean;
  @ApiProperty() sendRemindersOneHourBefore!: boolean;
  @ApiProperty() autoCancelUnconfirmedAfter24h!: boolean;
}

class TravelDto implements TravelSettingsResult {
  @ApiProperty() minBufferMinutes!: number;
  @ApiProperty() travelTimeEstimation!: boolean;
  @ApiProperty() maxTravelDistanceMiles!: number;
  @ApiProperty() allowBackToBackVisits!: boolean;
}

class HolidayDto implements HolidayResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() date!: string;
  @ApiProperty() policy!: string;
  @ApiProperty() policyLabel!: string;
}

/** The Schedule Settings screen response. */
export class SchedulingSettingsResponseDto implements SchedulingSettingsResult {
  @ApiProperty({ type: [BusinessHourDayDto] }) businessHours!: BusinessHourDayDto[];
  @ApiProperty({ type: [DefaultDurationDto] }) defaultDurations!: DefaultDurationDto[];
  @ApiProperty({ type: RulesDto }) rules!: RulesDto;
  @ApiProperty({ type: TravelDto }) travel!: TravelDto;
  @ApiProperty({ type: [HolidayDto] }) holidays!: HolidayDto[];

  static fromResult(result: SchedulingSettingsResult): SchedulingSettingsResponseDto {
    return result;
  }
}
