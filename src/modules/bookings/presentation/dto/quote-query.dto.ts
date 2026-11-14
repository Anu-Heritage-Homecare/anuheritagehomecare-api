import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';

/** Query contract for a Flexible booking price quote. */
export class QuoteQueryDto {
  @ApiProperty({
    enum: CarePlanType,
    enumName: 'CarePlanType',
    description: 'The plan the user selected; must be an hourly (pay as you go) plan',
  })
  @IsEnum(CarePlanType)
  planType!: CarePlanType;

  @ApiProperty({ example: 6, description: 'Chosen number of care hours' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  hours!: number;
}
