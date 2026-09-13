import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  ALL_HEALTH_EVENT_CATEGORIES,
  HealthEventCategory,
} from '@modules/care-recipients/domain/health-event-category.enum';

export class AddHealthEventRequestDto {
  @ApiProperty({ enum: ALL_HEALTH_EVENT_CATEGORIES })
  @IsIn(ALL_HEALTH_EVENT_CATEGORIES)
  category!: HealthEventCategory;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title!: string;

  @ApiProperty() @IsString() @MaxLength(2000) description!: string;

  @ApiPropertyOptional({ description: 'Who observed or reported the event' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  recordedByName?: string;

  @ApiPropertyOptional({ description: 'The reporter role, for example Caregiver or Geriatrician' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  recordedByRole?: string;

  @ApiProperty({ description: 'When the event happened (may be future for an appointment), ISO' })
  @IsISO8601()
  occurredAt!: string;
}
