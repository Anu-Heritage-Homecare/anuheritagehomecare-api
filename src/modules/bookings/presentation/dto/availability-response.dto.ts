import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityResult } from '../../application/dto/availability.result';

class AvailabilitySlotDto {
  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty()
  available!: boolean;
}

/** HTTP response contract for the bookable slots on a date. */
export class AvailabilityResponseDto {
  @ApiProperty({ example: '2026-07-28' })
  date!: string;

  @ApiProperty({ type: AvailabilitySlotDto, isArray: true })
  slots!: AvailabilitySlotDto[];

  static fromResult(result: AvailabilityResult): AvailabilityResponseDto {
    const dto = new AvailabilityResponseDto();
    dto.date = result.date;
    dto.slots = result.slots;
    return dto;
  }
}
