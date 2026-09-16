import { ApiProperty } from '@nestjs/swagger';
import {
  OperationalInsightsResult,
  PlanPerformanceResult,
  PlansBillingKpisResult,
  PlansBillingOverviewResult,
  RevenuePointResult,
  SubscriptionDistributionResult,
} from '../../application/dto/plans-billing-overview.result';

class PlansBillingKpisDto implements PlansBillingKpisResult {
  @ApiProperty() billedTodayMinor!: number;
  @ApiProperty() monthlyRevenueMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) monthlyGrowthPercent!: number | null;
  @ApiProperty() activeSubscriptions!: number;
  @ApiProperty() pendingCareRequests!: number;
  @ApiProperty() newSubscriptionsThisMonth!: number;
  @ApiProperty() pastDueSubscriptions!: number;
}

class RevenuePointDto implements RevenuePointResult {
  @ApiProperty() label!: string;
  @ApiProperty() monthStart!: string;
  @ApiProperty() totalMinor!: number;
}

class SubscriptionDistributionDto implements SubscriptionDistributionResult {
  @ApiProperty() planType!: string;
  @ApiProperty() planName!: string;
  @ApiProperty() activeSubscriptions!: number;
  @ApiProperty() sharePercent!: number;
  @ApiProperty() monthlyRevenueMinor!: number;
}

class PlanPerformanceDto implements PlanPerformanceResult {
  @ApiProperty() planType!: string;
  @ApiProperty() planName!: string;
  @ApiProperty() billingModel!: string;
  @ApiProperty() subscribers!: number;
  @ApiProperty() monthlyRevenueMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) unitPriceMinor!: number | null;
}

class OperationalInsightsDto implements OperationalInsightsResult {
  @ApiProperty({ nullable: true, type: Number }) averageMonthlySpendMinor!: number | null;
  @ApiProperty({ nullable: true, type: Number }) customerLifetimeValueMinor!: number | null;
  @ApiProperty() recurringRevenueMinor!: number;
  @ApiProperty() market!: string;
  @ApiProperty() marketRevenueMinor!: number;
  @ApiProperty() netNewSubscriptions!: number;
  @ApiProperty({ nullable: true, type: Number }) premiumExpansionRatePercent!: number | null;
}

/** The full Plans and Billing overview response for one currency. */
export class PlansBillingOverviewResponseDto implements PlansBillingOverviewResult {
  @ApiProperty() currency!: string;
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ type: PlansBillingKpisDto }) kpis!: PlansBillingKpisDto;
  @ApiProperty({ type: [RevenuePointDto] }) revenueSeries!: RevenuePointDto[];
  @ApiProperty({ type: [SubscriptionDistributionDto] })
  distribution!: SubscriptionDistributionDto[];
  @ApiProperty({ type: [PlanPerformanceDto] }) planPerformance!: PlanPerformanceDto[];
  @ApiProperty({ type: OperationalInsightsDto }) insights!: OperationalInsightsDto;

  static fromResult(result: PlansBillingOverviewResult): PlansBillingOverviewResponseDto {
    return result;
  }
}
