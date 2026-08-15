import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { SubscriptionResult } from '../../application/dto/subscription.result';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';

/** HTTP response contract for a monthly subscription. */
export class SubscriptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  careRecipientId!: string;

  @ApiProperty({ enum: CarePlanType, enumName: 'CarePlanType' })
  planType!: CarePlanType;

  @ApiProperty({ enum: SubscriptionStatus, enumName: 'SubscriptionStatus' })
  status!: SubscriptionStatus;

  @ApiProperty({ example: '2026-08-01' })
  startDate!: string;

  @ApiProperty({ enum: Currency, enumName: 'Currency' })
  currency!: Currency;

  @ApiProperty()
  monthlyPriceMinor!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static fromResult(result: SubscriptionResult): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = result.id;
    dto.careRecipientId = result.careRecipientId;
    dto.planType = result.planType;
    dto.status = result.status;
    dto.startDate = result.startDate;
    dto.currency = result.currency;
    dto.monthlyPriceMinor = result.monthlyPriceMinor;
    dto.createdAt = result.createdAt;
    dto.updatedAt = result.updatedAt;
    return dto;
  }
}
