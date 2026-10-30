import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { IncidentResolutionStatus } from '../../domain/incident-resolution-status.enum';

const STATUSES = Object.values(IncidentResolutionStatus);

/** Save the incident resolution form. Used by both Save Resolution and Mark Resolved. */
export class SaveResolutionDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: IncidentResolutionStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) summary?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) actionsTaken?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() followUpRequired?: boolean;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  followUpDate?: Date;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) followUpNotes?: string;
}
