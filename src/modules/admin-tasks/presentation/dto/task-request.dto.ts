import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { NOTIFICATION_CHANNELS } from '../../application/task-settings.defaults';
import { TaskCategory } from '../../domain/task-category.enum';
import { TaskPriority } from '../../domain/task-priority.enum';
import { TaskStatus } from '../../domain/task-status.enum';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const TABS = ['ALL', 'TODAY', 'OVERDUE', 'COMPLETED'] as const;

export class CreateTaskRequestDto {
  @ApiProperty({ example: 'Chase Maria Garcia CPR renewal' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskCategory })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @ApiPropertyOptional({ description: 'Admin the task is assigned to' })
  @IsOptional()
  @IsUUID()
  assignedToAdminId?: string;

  @ApiPropertyOptional({ description: 'Free text assignee for a person or team not on an account' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  assigneeLabel?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedCareRecipientId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedVisitId?: string;

  @ApiPropertyOptional({ example: '2026-09-10T17:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @ApiPropertyOptional({ example: 'Daily (weekdays)', description: 'Display only cadence label' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  recurrenceLabel?: string;

  @ApiPropertyOptional({ example: 20, description: 'Estimated effort in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ type: [String], description: 'Checklist line labels, in order' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  checklistItems?: string[];
}

/** Revise a task (all fields optional). */
export class UpdateTaskRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
  @ApiPropertyOptional({ enum: TaskCategory })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToAdminId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) assigneeLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedCareRecipientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedVisitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) recurrenceLabel?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}

/** Tick or untick a checklist item. */
export class SetChecklistItemRequestDto {
  @ApiProperty() @IsBoolean() done!: boolean;
}

/** Add a comment to a task. */
export class AddTaskCommentRequestDto {
  @ApiProperty({ example: 'Started medication round. No complaints reported.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

/** The Tasks screen filters, tab and pagination. */
export class TasksScreenQueryDto {
  @ApiPropertyOptional({ enum: TABS, default: 'ALL' })
  @IsOptional()
  @IsIn(TABS)
  tab?: (typeof TABS)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToAdminId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) assigneeLabel?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskCategory })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

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

/** Bulk assign the given tasks. */
export class BulkAssignRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  taskIds!: string[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToAdminId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) assigneeLabel?: string;
}

/** Bulk complete the given tasks. */
export class BulkCompleteRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  taskIds!: string[];
}

/** Create a reusable task template. */
export class CreateTemplateRequestDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional({ enum: TaskCategory })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;
  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
  @ApiPropertyOptional({ example: 'All Caregivers' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  defaultAssigneeLabel?: string;
  @ApiPropertyOptional({ type: [String], description: 'Default checklist line labels' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  checklistItems?: string[];
  @ApiPropertyOptional({ example: 'Daily, 7:00 AM - 8:00 AM', description: 'Display only' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  scheduleLabel?: string;
  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}

/** Revise a task template (all fields optional). */
export class UpdateTemplateRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional({ enum: TaskCategory })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;
  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) defaultAssigneeLabel?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  checklistItems?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) scheduleLabel?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}

/** Filters for the Task Templates screen. */
export class TaskTemplatesQueryDto {
  @ApiPropertyOptional({ enum: TaskCategory })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;
}

/** Instantiate a task from a template, with optional overrides. */
export class InstantiateTemplateRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsISO8601() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToAdminId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) assigneeLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedCareRecipientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedVisitId?: string;
}

/** Update a task category overlay. */
export class UpdateCategorySettingRequestDto {
  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'color must be a hex colour like #3B82F6' })
  color?: string;

  @ApiPropertyOptional({ example: 'heart' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional({ example: 'All Caregivers' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  autoAssignLabel?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

/** Update a priority level overlay. */
export class UpdatePrioritySettingRequestDto {
  @ApiPropertyOptional({ example: '#EF4444' })
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'color must be a hex colour like #EF4444' })
  color?: string;

  @ApiPropertyOptional({ example: 'Critical' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  slaHours?: number;

  @ApiPropertyOptional({ example: 'Immediate to Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  escalation?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

/** Update a notification preference. */
export class UpdateNotificationSettingRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;

  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(NOTIFICATION_CHANNELS, { each: true })
  channels?: string[];
}
