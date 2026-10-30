import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AnnouncementAudience } from '../../domain/announcement-audience.enum';
import { AnnouncementPriority } from '../../domain/announcement-priority.enum';

const TABS = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;
const ACTIONS = ['DRAFT', 'SCHEDULE', 'PUBLISH'] as const;

export class ListAnnouncementsQueryDto {
  @ApiPropertyOptional({ enum: TABS, default: 'PUBLISHED' })
  @IsOptional()
  @IsIn(TABS)
  tab?: (typeof TABS)[number];
}

export class CreateAnnouncementRequestDto {
  @ApiProperty({ example: 'July Schedule Changes' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Please review the updated shift rota effective next week.' })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;

  @ApiProperty({ enum: AnnouncementAudience, isArray: true, description: 'At least one audience' })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(AnnouncementAudience, { each: true })
  audiences!: AnnouncementAudience[];

  @ApiPropertyOptional({ enum: AnnouncementPriority, default: AnnouncementPriority.Normal })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiProperty({ enum: ACTIONS, description: 'Save as draft, schedule, or publish now' })
  @IsIn(ACTIONS)
  action!: (typeof ACTIONS)[number];

  @ApiPropertyOptional({
    description: 'Required when action is SCHEDULE (ISO 8601, must be future)',
  })
  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;
}
