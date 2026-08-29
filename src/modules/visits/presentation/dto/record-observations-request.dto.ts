import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const MAX_LENGTH = 120;

/**
 * The caregiver's qualitative observations for a visit. Every field is optional
 * short free text; sending all four replaces the visit's observation record.
 */
export class RecordObservationsRequestDto {
  @ApiPropertyOptional({ example: 'Good', maxLength: MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LENGTH)
  mood?: string | null;

  @ApiPropertyOptional({ example: 'Ate well', maxLength: MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LENGTH)
  appetite?: string | null;

  @ApiPropertyOptional({ example: 'Walked with walker', maxLength: MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LENGTH)
  mobility?: string | null;

  @ApiPropertyOptional({ example: 'All taken', maxLength: MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LENGTH)
  medicationStatus?: string | null;
}
