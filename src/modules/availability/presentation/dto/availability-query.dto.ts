import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

/**
 * Query for a caregiver's availability. `date` asks for a single day; `from`/`to`
 * ask for an inclusive range (the week strip). With none supplied it defaults to
 * today.
 */
export class AvailabilityQueryDto {
  @ApiPropertyOptional({ example: '2026-07-11', description: 'A single calendar day (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: '2026-07-06', description: 'Start of an inclusive range' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-12', description: 'End of an inclusive range' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
