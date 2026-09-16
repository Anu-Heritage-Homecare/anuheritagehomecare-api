import { ApiPropertyOptional } from '@nestjs/swagger';
import { CareRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const STATUSES = Object.values(CareRequestStatus);

/** Filters and paging for the care request queue; defaults to the pending queue. */
export class CareRequestsQueryDto {
  @ApiPropertyOptional({ enum: STATUSES, default: CareRequestStatus.PENDING })
  @IsOptional()
  @IsIn(STATUSES)
  status?: CareRequestStatus;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
