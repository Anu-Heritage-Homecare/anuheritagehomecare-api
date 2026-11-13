import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaregiverEmploymentType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID, MaxLength } from 'class-validator';

/** The Workforce Report controls: the reporting period and the three dropdowns. */
export class WorkforceReportQueryDto {
  @ApiPropertyOptional({
    description: 'Period start (inclusive), ISO 8601; defaults to 30 days ago',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Period end (inclusive), ISO 8601; defaults to now' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Branch filter, matched to the caregiver profile branch; omit for all',
  })
  @IsOptional()
  @MaxLength(120)
  branch?: string;

  @ApiPropertyOptional({ description: 'Caregiver filter (a caregiver user id); omit for all' })
  @IsOptional()
  @IsUUID()
  caregiverId?: string;

  @ApiPropertyOptional({
    enum: CaregiverEmploymentType,
    description: 'Employment Type filter; omit for all',
  })
  @IsOptional()
  @IsEnum(CaregiverEmploymentType)
  employmentType?: CaregiverEmploymentType;
}
