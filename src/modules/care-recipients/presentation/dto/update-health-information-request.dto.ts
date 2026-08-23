import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const MAX_ITEMS = 50;
const MAX_ITEM_LENGTH = 200;
const MAX_DOSE_LENGTH = 60;
const LAST_MINUTE_OF_DAY = 24 * 60 - 1;

/** One medication on the schedule: what it is, the dose and the time of day. */
export class MedicationDto {
  @ApiProperty({ example: 'Metformin' })
  @IsString()
  @MaxLength(MAX_ITEM_LENGTH)
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: '500 mg' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DOSE_LENGTH)
  dose?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 0,
    maximum: LAST_MINUTE_OF_DAY,
    example: 510,
    description: 'Time of day as minutes from midnight (510 = 8:30 AM)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(LAST_MINUTE_OF_DAY)
  scheduleMinute?: number | null;
}

/**
 * Request contract for the third onboarding step: health information and the
 * medication schedule. This carries sensitive personal data and is excluded from
 * logs.
 */
export class UpdateHealthInformationRequestDto {
  @ApiPropertyOptional({
    isArray: true,
    type: String,
    example: ['Hypertension', 'Type 2 diabetes'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_ITEM_LENGTH, { each: true })
  medicalConditions?: string[];

  @ApiPropertyOptional({ isArray: true, type: String, example: ['Penicillin'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_ITEM_LENGTH, { each: true })
  allergies?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  needsMedicationHelp!: boolean;

  @ApiPropertyOptional({ type: [MedicationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications?: MedicationDto[];
}
