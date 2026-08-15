import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CareFrequency } from '../../domain/care-frequency.enum';

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
}
