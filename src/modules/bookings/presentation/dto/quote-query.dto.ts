import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

/** Query contract for a Flexible booking price quote. */
export class QuoteQueryDto {
  @ApiProperty({ example: 6, description: 'Chosen number of care hours' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  hours!: number;
}
