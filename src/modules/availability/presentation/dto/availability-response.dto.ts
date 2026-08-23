import { ApiProperty } from '@nestjs/swagger';
import {
  AvailabilityResult,
  AvailabilitySlotResult,
} from '../../application/dto/availability.result';

/** One available window within a day, as minutes from midnight. */
export class AvailabilitySlotResponseDto {
  @ApiProperty({ example: 480, description: 'Start minute from midnight (08:00 is 480)' })
  startMinute!: number;

  @ApiProperty({ example: 540, description: 'End minute from midnight (09:00 is 540)' })
  endMinute!: number;

  static fromResult(result: AvailabilitySlotResult): AvailabilitySlotResponseDto {
    const dto = new AvailabilitySlotResponseDto();
    dto.startMinute = result.startMinute;
    dto.endMinute = result.endMinute;
    return dto;
  }
}

/** A caregiver's availability for a single day. */
export class AvailabilityDayResponseDto {
  @ApiProperty({ format: 'uuid' })
  caregiverId!: string;

  @ApiProperty({ example: '2026-07-11' })
  date!: string;

  @ApiProperty({ type: [AvailabilitySlotResponseDto] })
  slots!: AvailabilitySlotResponseDto[];

  static fromResult(result: AvailabilityResult): AvailabilityDayResponseDto {
    const dto = new AvailabilityDayResponseDto();
    dto.caregiverId = result.caregiverId;
    dto.date = result.date;
    dto.slots = result.slots.map((slot) => AvailabilitySlotResponseDto.fromResult(slot));
    return dto;
  }
}

/** A list of days with availability, for a single day or a range request. */
export class AvailabilityListResponseDto {
  @ApiProperty({ type: [AvailabilityDayResponseDto] })
  days!: AvailabilityDayResponseDto[];

  static fromResults(results: AvailabilityResult[]): AvailabilityListResponseDto {
    const dto = new AvailabilityListResponseDto();
    dto.days = results.map((result) => AvailabilityDayResponseDto.fromResult(result));
    return dto;
  }
}
