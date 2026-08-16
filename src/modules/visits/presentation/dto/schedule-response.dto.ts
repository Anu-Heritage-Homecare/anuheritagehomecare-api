import { ApiProperty } from '@nestjs/swagger';
import { ScheduleResult, VisitCardResult } from '../../application/dto/visit-card.result';
import { VisitStatus } from '../../domain/visit-status.enum';
import { minutesToClock } from './time-format';

class ScheduleRecipientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'FEMALE' })
  gender!: string;

  @ApiProperty({ example: 82 })
  age!: number;

  @ApiProperty({ type: [String], example: ['MEAL_PREPARATION', 'HOUSEKEEPING'] })
  careNeeds!: string[];

  @ApiProperty({ example: '123 Maple Street, Sunnyvale, CA 94086' })
  address!: string;

  @ApiProperty({ nullable: true })
  photoKey!: string | null;
}

/** One visit as it appears in a caregiver's schedule list. */
export class VisitCardResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: VisitStatus, enumName: 'VisitStatus' })
  status!: VisitStatus;

  @ApiProperty({ example: '2026-07-12' })
  date!: string;

  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '10:00' })
  endTime!: string;

  @ApiProperty({ type: ScheduleRecipientDto })
  recipient!: ScheduleRecipientDto;

  static fromResult(result: VisitCardResult): VisitCardResponseDto {
    const dto = new VisitCardResponseDto();
    dto.id = result.id;
    dto.status = result.status;
    dto.date = result.date;
    dto.startTime = minutesToClock(result.startMinute);
    dto.endTime = minutesToClock(result.endMinute);
    dto.recipient = { ...result.recipient };
    return dto;
  }
}

/** A caregiver's schedule over the requested day or range. */
export class ScheduleResponseDto {
  @ApiProperty({ example: '2026-07-12' })
  from!: string;

  @ApiProperty({ example: '2026-07-12' })
  to!: string;

  @ApiProperty({ type: [VisitCardResponseDto] })
  visits!: VisitCardResponseDto[];

  static fromResult(result: ScheduleResult): ScheduleResponseDto {
    const dto = new ScheduleResponseDto();
    dto.from = result.from;
    dto.to = result.to;
    dto.visits = result.visits.map((visit) => VisitCardResponseDto.fromResult(visit));
    return dto;
  }
}
