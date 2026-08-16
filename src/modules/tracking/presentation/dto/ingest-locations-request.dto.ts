import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { LocationMode } from '../../domain/location-mode.enum';

/** Largest batch of points accepted in a single request, to bound the write. */
const MAX_POINTS_PER_BATCH = 500;

class LocationPointDto {
  @ApiProperty({ example: 37.3861 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -122.0839 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Reported accuracy in metres' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @ApiProperty({ enum: LocationMode, enumName: 'LocationMode' })
  @IsEnum(LocationMode)
  mode!: LocationMode;

  @ApiProperty({ example: '2026-07-12T09:12:00.000Z', description: 'Device time of the fix' })
  @IsISO8601()
  recordedAt!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'The visit this point relates to, if any' })
  @IsOptional()
  @IsUUID()
  visitId?: string;
}

/** A batch of location breadcrumbs uploaded by the caregiver's device. */
export class IngestLocationsRequestDto {
  @ApiProperty({ type: [LocationPointDto], maxItems: MAX_POINTS_PER_BATCH })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_POINTS_PER_BATCH)
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  points!: LocationPointDto[];
}
