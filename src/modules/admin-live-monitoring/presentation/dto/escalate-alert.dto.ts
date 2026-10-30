import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Escalate an alert from the Live Monitoring modal. Level is required; the rest optional. */
export class EscalateAlertDto {
  @ApiProperty({ description: 'Escalation level, e.g. "Operations Manager"' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  level!: string;

  @ApiPropertyOptional({ description: 'Who the escalation is assigned to' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  assignTo?: string;

  @ApiPropertyOptional({ description: 'Reason, e.g. "Unresponsive Caregiver"' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
