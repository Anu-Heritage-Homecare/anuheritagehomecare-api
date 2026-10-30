import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Acknowledge an alert from the Live Monitoring modal, with an optional note. */
export class AcknowledgeAlertDto {
  @ApiPropertyOptional({
    description: 'Optional acknowledge note, e.g. "Attempting to contact caregiver"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
