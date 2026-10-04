import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitPriority } from '@modules/visits/domain/visit-priority.enum';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const STATUSES = Object.values(VisitStatus);
const PRIORITIES = Object.values(VisitPriority);

/** The Scheduling console for a day, with optional table filters and pagination. */
export class SchedulingConsoleQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  date?: string;
  @ApiPropertyOptional({ enum: STATUSES }) @IsOptional() @IsIn(STATUSES) status?: VisitStatus;
  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: VisitPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) search?: string;
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** The Unassigned Visits tab for a day. */
export class UnassignedVisitsQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  date?: string;
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** The Conflicts and Alerts tab for a day. */
export class SchedulingConflictsQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  date?: string;
}

const CANDIDATE_SORTS = ['BEST_MATCH', 'DISTANCE', 'RATING'] as const;

/** Filters and sort for the Assign Caregiver candidate list. */
export class AssignCandidatesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) branch?: string;
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableNow?: boolean;
  @ApiPropertyOptional({ enum: CANDIDATE_SORTS })
  @IsOptional()
  @IsIn(CANDIDATE_SORTS)
  sort?: (typeof CANDIDATE_SORTS)[number];
}

/** The Calendar feed for an inclusive day range. */
export class SchedulingCalendarQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  from?: string;
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
