import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CareFrequency } from '../../domain/care-frequency.enum';
import { Weekday } from '../../domain/weekday.enum';

const MINUTES_IN_DAY = 24 * 60;

/** Request contract for the fourth onboarding step: the care schedule. */
export class UpdateCareScheduleRequestDto {
  @ApiProperty({ enum: CareFrequency, enumName: 'CareFrequency', example: CareFrequency.Weekly })
  @IsIn(Object.values(CareFrequency))
  frequency!: string;

  @ApiProperty({
    example: '2026-08-20',
    description: 'Estimated start date as an ISO calendar date',
  })
  @IsDateString()
  estimatedStartDate!: string;

  @ApiProperty({ example: '3 to 6 months', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  expectedDuration!: string;

  @ApiPropertyOptional({
    enum: Weekday,
    enumName: 'Weekday',
    isArray: true,
    example: [Weekday.Monday, Weekday.Wednesday, Weekday.Friday],
    description: 'Weekdays the recurring visit falls on',
  })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(Weekday), { each: true })
  days?: string[];

  @ApiPropertyOptional({
    example: 540,
    description: 'Visit start time as minutes from midnight (0 to 1439)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY - 1)
  startMinute?: number;

  @ApiPropertyOptional({
    example: 180,
    description: 'How long a single visit lasts, in minutes',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MINUTES_IN_DAY)
  visitDurationMinutes?: number;
}
