import { ApiProperty } from '@nestjs/swagger';
import {
  EnrichedSubscriptionListResult,
  EnrichedSubscriptionRowResult,
  FlexibleHoursUsageResult,
  SubscriptionKpisResult,
} from '../../application/dto/enriched-subscription-list.result';

class FlexibleHoursUsageDto implements FlexibleHoursUsageResult {
  @ApiProperty() allocatedHours!: number;
  @ApiProperty() usedHours!: number;
  @ApiProperty() remainingHours!: number;
  @ApiProperty() percentUsed!: number;
}

class EnrichedSubscriptionRowDto implements EnrichedSubscriptionRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) clientName!: string | null;
  @ApiProperty({ nullable: true, type: Number }) patientAge!: number | null;
  @ApiProperty({ nullable: true, type: String }) accountHolderName!: string | null;
  @ApiProperty() planType!: string;
  @ApiProperty() planName!: string;
  @ApiProperty() status!: string;
  @ApiProperty() autoRenew!: boolean;
  @ApiProperty() billingCycle!: string;
  @ApiProperty({ nullable: true, type: String }) renewalDate!: string | null;
  @ApiProperty() monthlyPriceMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: String }) coordinatorName!: string | null;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty({ nullable: true, type: FlexibleHoursUsageDto })
  flexibleHours!: FlexibleHoursUsageDto | null;
}

/** The Active Subscriptions table response. */
export class EnrichedSubscriptionListResponseDto implements EnrichedSubscriptionListResult {
  @ApiProperty() currency!: string;
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [EnrichedSubscriptionRowDto] }) rows!: EnrichedSubscriptionRowDto[];

  static fromResult(result: EnrichedSubscriptionListResult): EnrichedSubscriptionListResponseDto {
    return result;
  }
}

/** The Subscriptions KPI bar response. */
export class SubscriptionKpisResponseDto implements SubscriptionKpisResult {
  @ApiProperty() currency!: string;
  @ApiProperty() totalActive!: number;
  @ApiProperty() paused!: number;
  @ApiProperty() pendingActivation!: number;
  @ApiProperty() cancelled!: number;
  @ApiProperty() renewingSoon!: number;
  @ApiProperty() expiring!: number;
  @ApiProperty() capped!: boolean;

  static fromResult(result: SubscriptionKpisResult): SubscriptionKpisResponseDto {
    return result;
  }
}
