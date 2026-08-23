import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * The caregiver's current position when they raise an SOS. Best effort: the alert
 * is still raised without a location, since an emergency must never be blocked by
 * a missing or denied GPS fix. Live position is then streamed separately while the
 * alert is active. Coordinates are sensitive and excluded from logs.
 */
export class RaiseSosRequestDto {
  @ApiPropertyOptional({ example: 37.3861, description: 'Current latitude of the caregiver' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ example: -122.0839, description: 'Current longitude of the caregiver' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}
