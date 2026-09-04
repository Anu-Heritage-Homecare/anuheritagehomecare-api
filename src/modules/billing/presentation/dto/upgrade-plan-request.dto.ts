import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';

/** Request to change a subscription onto a different plan tier. */
export class UpgradePlanRequestDto {
  @ApiProperty({
    enum: CarePlanType,
    enumName: 'CarePlanType',
    example: CarePlanType.Premium,
    description: 'The plan tier to move onto',
  })
  @IsIn(Object.values(CarePlanType))
  planType!: string;
}
