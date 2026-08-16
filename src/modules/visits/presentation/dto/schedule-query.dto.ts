import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { VisitStatus } from '../../domain/visit-status.enum';

/**
 * Query for a caregiver's schedule. `date` asks for a single day; `from`/`to`
 * ask for an inclusive range (the Week view). With none supplied the schedule
 * defaults to today. `status` narrows the list to one visit status.
 */
export class ScheduleQueryDto {
  @ApiPropertyOptional({ example: '2026-07-12', description: 'A single calendar day (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: '2026-07-12', description: 'Start of an inclusive range' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-18', description: 'End of an inclusive range' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: VisitStatus, enumName: 'VisitStatus' })
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;
}
