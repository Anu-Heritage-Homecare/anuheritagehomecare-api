import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

/** The caregiver's current position, checked against the recipient geofence. */
export class ClockInRequestDto {
  @ApiProperty({ example: 37.3861, description: 'Current latitude of the caregiver' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -122.0839, description: 'Current longitude of the caregiver' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
