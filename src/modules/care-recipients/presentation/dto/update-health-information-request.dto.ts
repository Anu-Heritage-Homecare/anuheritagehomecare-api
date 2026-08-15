import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

const MAX_ITEMS = 50;
const MAX_ITEM_LENGTH = 200;

/**
 * Request contract for the third onboarding step: health and medication
 * information. This carries sensitive personal data and is excluded from logs.
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

  @ApiPropertyOptional({ isArray: true, type: String, example: ['Metformin 500mg'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_ITEM_LENGTH, { each: true })
  medications?: string[];
}
