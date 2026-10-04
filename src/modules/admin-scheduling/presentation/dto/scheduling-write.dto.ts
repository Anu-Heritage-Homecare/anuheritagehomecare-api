import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitPriority } from '@modules/visits/domain/visit-priority.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
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
} from 'class-validator';

const VISIT_TYPES = Object.values(VisitType);
const PRIORITIES = Object.values(VisitPriority);

/** Schedule (create) a new visit. */
export class ScheduleVisitDto {
  @ApiProperty() @IsUUID() careRecipientId!: string;
  @ApiPropertyOptional({ description: 'Leave empty to create an unassigned visit' })
  @IsOptional()
  @IsUUID()
  caregiverId?: string;
  @ApiProperty({ type: String, format: 'date' }) @IsISO8601() scheduledDate!: string;
  @ApiProperty({ minimum: 0, maximum: 1440 }) @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @ApiProperty({ minimum: 0, maximum: 1440 }) @IsInt() @Min(0) @Max(1440) endMinute!: number;
  @ApiProperty({ enum: VISIT_TYPES }) @IsIn(VISIT_TYPES) visitType!: VisitType;
  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: VisitPriority;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  tasks?: string[];
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
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  tasks?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  specialInstructions?: string[];
}
