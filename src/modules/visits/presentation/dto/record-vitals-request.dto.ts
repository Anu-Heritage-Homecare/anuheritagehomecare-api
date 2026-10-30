import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

const MAX_PRESSURE = 400;
const MAX_HEART_RATE = 400;
const MAX_WEIGHT_GRAMS = 500_000;
const MIN_TEMP = 30;
const MAX_TEMP = 45;

/**
 * A set of vital signs recorded during a visit. Every measure is optional, but at
 * least one must be supplied (enforced in the domain). Weight is whole grams.
 */
export class RecordVitalsRequestDto {
  @ApiPropertyOptional({ minimum: 0, maximum: MAX_PRESSURE, example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRESSURE)
  systolic?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_PRESSURE, example: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRESSURE)
  diastolic?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_HEART_RATE, example: 72 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_HEART_RATE)
  heartRate?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 98 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number | null;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: MAX_WEIGHT_GRAMS,
    example: 98000,
    description: 'Weight in whole grams (98 kg = 98000)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_WEIGHT_GRAMS)
  weightGrams?: number | null;

  @ApiPropertyOptional({
    minimum: MIN_TEMP,
    maximum: MAX_TEMP,
    example: 36.8,
    description: 'Body temperature in degrees Celsius (one decimal)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(MIN_TEMP)
  @Max(MAX_TEMP)
  temperatureCelsius?: number | null;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 2000,
    example: 142,
    description: 'Blood glucose in mg/dL',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000)
  bloodGlucose?: number | null;

  @ApiPropertyOptional({
    minimum: 0,
    example: 2,
    description: 'The checklist task position this reading was recorded under',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  visitTaskPosition?: number;
}
