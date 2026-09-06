import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskStatus } from '../../domain/task-status.enum';

export class CreateTaskRequestDto {
  @ApiPropertyOptional({ example: 'Chase Maria Garcia CPR renewal' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Admin the task is assigned to' })
  @IsOptional()
  @IsUUID()
  assignedToAdminId?: string;

  @ApiPropertyOptional({ description: 'Care recipient the task relates to' })
  @IsOptional()
  @IsUUID()
  relatedCareRecipientId?: string;

  @ApiPropertyOptional({ example: '2026-09-10T17:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;
}

export class ListTasksQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter to a single status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
