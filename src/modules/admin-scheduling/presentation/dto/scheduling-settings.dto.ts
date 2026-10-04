import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { HolidayPolicy } from '../../domain/holiday-policy.enum';

const WEEKDAYS = Object.values(Weekday);
const VISIT_TYPES = Object.values(VisitType);
const HOLIDAY_POLICIES = Object.values(HolidayPolicy);

/** One weekday's business hours. */
export class BusinessHourDayDto {
  @ApiProperty({ enum: WEEKDAYS }) @IsIn(WEEKDAYS) weekday!: Weekday;
  @ApiProperty() @IsBoolean() open!: boolean;
  @ApiProperty({ minimum: 0, maximum: 1440 }) @IsInt() @Min(0) @Max(1440) openMinute!: number;
  @ApiProperty({ minimum: 0, maximum: 1440 }) @IsInt() @Min(0) @Max(1440) closeMinute!: number;
}

/** One service type's default visit duration, in minutes. */
export class DefaultDurationDto {
  @ApiProperty({ enum: VISIT_TYPES }) @IsIn(VISIT_TYPES) visitType!: VisitType;
  @ApiProperty({ minimum: 1, maximum: 1440 }) @IsInt() @Min(1) @Max(1440) minutes!: number;
}

/** The scheduling rule toggles. */
export class SchedulingRulesDto {
  @ApiProperty() @IsBoolean() requireCertificationMatch!: boolean;
  @ApiProperty() @IsBoolean() autoAssignPreferredCaregiver!: boolean;
  @ApiProperty() @IsBoolean() allowOvertimeScheduling!: boolean;
  @ApiProperty() @IsBoolean() requireCoordinatorApprovalForUrgent!: boolean;
  @ApiProperty() @IsBoolean() sendRemindersOneHourBefore!: boolean;
  @ApiProperty() @IsBoolean() autoCancelUnconfirmedAfter24h!: boolean;
}

/** The travel and buffer settings. */
export class TravelSettingsDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) minBufferMinutes!: number;
  @ApiProperty() @IsBoolean() travelTimeEstimation!: boolean;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) maxTravelDistanceMiles!: number;
  @ApiProperty() @IsBoolean() allowBackToBackVisits!: boolean;
}

/** Save any subset of the Schedule Settings sections. */
export class UpdateSchedulingSettingsDto {
  @ApiPropertyOptional({ type: [BusinessHourDayDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDayDto)
  businessHours?: BusinessHourDayDto[];

  @ApiPropertyOptional({ type: [DefaultDurationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DefaultDurationDto)
  defaultDurations?: DefaultDurationDto[];

  @ApiPropertyOptional({ type: SchedulingRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulingRulesDto)
  rules?: SchedulingRulesDto;

  @ApiPropertyOptional({ type: TravelSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TravelSettingsDto)
  travel?: TravelSettingsDto;
}

/** Add a holiday to the calendar. */
export class AddHolidayDto {
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() date!: string;
  @ApiProperty({ enum: HOLIDAY_POLICIES }) @IsIn(HOLIDAY_POLICIES) policy!: HolidayPolicy;
}
