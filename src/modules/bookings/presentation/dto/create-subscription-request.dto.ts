import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsUUID } from 'class-validator';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';

const MONTHLY_PLANS = [CarePlanType.StandardMonthly, CarePlanType.Premium, CarePlanType.LiveIn];

/** Request contract to subscribe a care recipient to a monthly plan. */
export class CreateSubscriptionRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  careRecipientId!: string;

  @ApiProperty({ enum: MONTHLY_PLANS, description: 'One of the monthly plans' })
  @IsIn(MONTHLY_PLANS)
  planType!: string;

  @ApiProperty({ example: '2026-08-01', description: 'Start date as an ISO calendar date' })
  @IsDateString()
  startDate!: string;
}
