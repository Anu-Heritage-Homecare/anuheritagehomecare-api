import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitPriority } from '@modules/visits/domain/visit-priority.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { VisitTaskCategory } from '@modules/visits/domain/value-objects/visit-task-category.enum';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const VISIT_TYPES = Object.values(VisitType);
const PRIORITIES = Object.values(VisitPriority);
const TASK_CATEGORIES = Object.values(VisitTaskCategory);

/** One planned checklist task: its label, care category and optional planned time. */
export class VisitTaskInputDto {
  @ApiProperty() @IsString() @MaxLength(200) label!: string;
  @ApiPropertyOptional({ enum: TASK_CATEGORIES })
  @IsOptional()
  @IsIn(TASK_CATEGORIES)
  category?: VisitTaskCategory;
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1439,
    description: 'Planned time, minutes from midnight',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  scheduledMinute?: number;
}

/** Schedule (create) a new visit. */
export class ScheduleVisitDto {
  @ApiProperty() @IsUUID() careRecipientId!: string;
  @ApiPropertyOptional({ description: 'Leave empty to create an unassigned visit' })
  @IsOptional()
  @IsUUID()
  caregiverId?: string;
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() scheduledDate!: string;
  @ApiProperty({ minimum: 0, maximum: 1440 }) @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1440,
    description: 'Omit to apply the configured default duration for the service type',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute?: number;
  @ApiProperty({ enum: VISIT_TYPES }) @IsIn(VISIT_TYPES) visitType!: VisitType;
  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: VisitPriority;
  @ApiPropertyOptional({ type: [VisitTaskInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => VisitTaskInputDto)
  tasks?: VisitTaskInputDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  specialInstructions?: string[];
}

/** Assign a caregiver to a visit. */
export class AssignVisitDto {
  @ApiProperty() @IsUUID() caregiverId!: string;
}

/** The text of a coordinator note or a reply. */
export class VisitNoteTextDto {
  @ApiProperty({ maxLength: 4000 }) @IsString() @MaxLength(4000) text!: string;
}

/** Reschedule a visit to a new day and time window. */
export class RescheduleVisitDto {
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() scheduledDate!: string;
  @ApiProperty({ minimum: 0, maximum: 1440 }) @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @ApiProperty({ minimum: 0, maximum: 1440 }) @IsInt() @Min(0) @Max(1440) endMinute!: number;
}

/** Edit a scheduled visit's details. Every field is optional; omitted fields are left as is. */
export class EditVisitDto {
  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsISO8601()
  scheduledDate?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute?: number;
  @ApiPropertyOptional({ enum: VISIT_TYPES })
  @IsOptional()
  @IsIn(VISIT_TYPES)
  visitType?: VisitType;
  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: VisitPriority;
  @ApiPropertyOptional({ type: [VisitTaskInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => VisitTaskInputDto)
  tasks?: VisitTaskInputDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  specialInstructions?: string[];
}
