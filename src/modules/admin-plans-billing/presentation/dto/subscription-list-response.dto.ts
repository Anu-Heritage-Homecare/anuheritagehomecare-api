import { ApiProperty } from '@nestjs/swagger';
import {
  SubscriptionListResult,
  SubscriptionRowResult,
} from '../../application/dto/subscription-list.result';

class SubscriptionRowDto implements SubscriptionRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) clientName!: string | null;
  @ApiProperty({ nullable: true, type: String }) accountHolderName!: string | null;
  @ApiProperty() planType!: string;
  @ApiProperty() planName!: string;
  @ApiProperty() billingCycle!: string;
  @ApiProperty() status!: string;
  @ApiProperty() startDate!: string;
  @ApiProperty({ nullable: true, type: String }) nextRenewalDate!: string | null;
  @ApiProperty() monthlyPriceMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() autoRenew!: boolean;
  @ApiProperty({ nullable: true, type: Number }) remainingHours!: number | null;
}

/** The Subscription Management table response for one currency. */
export class SubscriptionListResponseDto implements SubscriptionListResult {
  @ApiProperty() currency!: string;
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [SubscriptionRowDto] }) rows!: SubscriptionRowDto[];

  static fromResult(result: SubscriptionListResult): SubscriptionListResponseDto {
    return result;
  }
}
