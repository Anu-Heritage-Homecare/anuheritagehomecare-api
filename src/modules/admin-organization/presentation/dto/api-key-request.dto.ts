import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Issue a new API key (the Create Key action). */
export class CreateApiKeyRequestDto {
  @ApiProperty({ example: 'Mobile App Integration' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    type: [String],
    example: ['read_recipients', 'read_schedules', 'read_write_messages'],
    description: 'Free text permission scopes this key is granted',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  scopes!: string[];

  @ApiPropertyOptional({ example: 1000, minimum: 1, maximum: 1_000_000, default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  rateLimitPerHour?: number;
}
