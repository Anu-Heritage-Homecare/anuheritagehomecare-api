import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';

const MONTHLY_PLANS = [
  CarePlanType.StandardMonthly,
  CarePlanType.Premium,
  CarePlanType.LiveIn,
] as const;

/** The target plan tier for a subscription upgrade or downgrade. */
export class ChangeSubscriptionPlanRequestDto {
  @ApiProperty({ enum: MONTHLY_PLANS })
  @IsIn(MONTHLY_PLANS)
  planType!: CarePlanType;
}
