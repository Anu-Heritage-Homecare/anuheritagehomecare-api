import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class NoteDto {
  @ApiPropertyOptional({ description: 'A note for the prescription audit trail' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class MedicationRequestDto extends NoteDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) dose?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) purpose?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) prescribedBy?: string;

  @ApiPropertyOptional({ description: 'Prescription start date, ISO date' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) instructions?: string;

  @ApiPropertyOptional({
    description: 'Times of day a dose is due, minutes from midnight',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1439, { each: true })
  doseTimes?: number[];
}

export class DiscontinueMedicationRequestDto extends NoteDto {}

class WarningItemDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(1000) detail!: string;
}

export class SetMedicationWarningsRequestDto extends NoteDto {
  @ApiProperty({ type: [WarningItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WarningItemDto)
  warnings!: WarningItemDto[];
}
