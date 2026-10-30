import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Resolve an alert from the Live Monitoring modal, with resolution detail. */
export class ResolveAlertDto {
  @ApiPropertyOptional({ description: 'Resolution category, e.g. "Caregiver Arrived Late"' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ description: 'The action taken to resolve the alert' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionTaken?: string;

  @ApiPropertyOptional({ description: 'Optional internal notes or billing adjustments' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNote?: string;
}
