import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ALL_DISCHARGE_ACKNOWLEDGEMENTS,
  DischargeAcknowledgement,
} from '@modules/care-recipients/domain/discharge-acknowledgement.enum';
import {
  ALL_DISCHARGE_ACTIONS,
  DischargeAction,
} from '@modules/care-recipients/domain/discharge-action.enum';
import {
  ALL_DISCHARGE_REASONS,
  DischargeReason,
} from '@modules/care-recipients/domain/discharge-reason.enum';

/**
 * The archive/discharge form. The same shape backs Save Draft (fields may be partial)
 * and Process Discharge (the domain enforces completeness by action).
 */
export class DischargeFormRequestDto {
  @ApiProperty({ enum: ALL_DISCHARGE_ACTIONS })
  @IsIn(ALL_DISCHARGE_ACTIONS)
  action!: DischargeAction;

  @ApiPropertyOptional({ enum: ALL_DISCHARGE_REASONS })
  @IsOptional()
  @IsIn(ALL_DISCHARGE_REASONS)
  reason?: DischargeReason;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  clinicalSummary?: string;

  @ApiPropertyOptional({ enum: ALL_DISCHARGE_ACKNOWLEDGEMENTS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(ALL_DISCHARGE_ACKNOWLEDGEMENTS, { each: true })
  acknowledgements?: DischargeAcknowledgement[];
}
