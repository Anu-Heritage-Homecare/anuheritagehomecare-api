import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const MINUTES_IN_DAY = 24 * 60;
const MAX_SLOTS = 48;

/** One availability window in a set request, as minutes from midnight. */
export class AvailabilitySlotDto {
  @ApiProperty({
    minimum: 0,
    maximum: MINUTES_IN_DAY,
    example: 480,
    description: 'Start minute from midnight (08:00 is 480)',
  })
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  startMinute!: number;

  @ApiProperty({
    minimum: 0,
    maximum: MINUTES_IN_DAY,
    example: 540,
    description: 'End minute from midnight (09:00 is 540)',
  })
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  endMinute!: number;
}

/**
 * Request to set (replace) a caregiver's availability for a single day. The
 * windows must not overlap; ordering is applied server side.
 */
export class SetAvailabilityRequestDto {
  @ApiProperty({ example: '2026-07-11', description: 'The calendar day (YYYY-MM-DD)' })
  @IsISO8601()
  date!: string;

  @ApiProperty({
    required: false,
    minimum: 1,
    example: 3,
    description:
      'The revision this day was last fetched at. Send it to detect a conflicting edit from another device (409 on mismatch); omit it to overwrite unconditionally.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRevision?: number;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ArrayMaxSize(MAX_SLOTS)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}
