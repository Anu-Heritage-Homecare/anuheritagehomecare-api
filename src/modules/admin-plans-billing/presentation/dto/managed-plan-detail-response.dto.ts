import { ApiProperty } from '@nestjs/swagger';
import {
  ManagedPlanDetailResult,
  PlanAnalyticsResult,
  PlanLifecycleResult,
  PlanPriceStructureResult,
  PlanServiceResult,
  PlanVersionResult,
  PlanVolumeDiscountResult,
} from '../../application/dto/managed-plan-detail.result';

class PlanPriceStructureDto implements PlanPriceStructureResult {
  @ApiProperty() currency!: string;
  @ApiProperty({ nullable: true, type: Number }) monthlyPriceMinor!: number | null;
  @ApiProperty({ nullable: true, type: Number }) baseRateMinor!: number | null;
  @ApiProperty({ nullable: true, type: Number }) emergencyDispatchRateMinor!: number | null;
  @ApiProperty({ nullable: true, type: Number }) weekendPremiumMinor!: number | null;
}

class PlanServiceDto implements PlanServiceResult {
  @ApiProperty() key!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() enabled!: boolean;
}

class PlanVolumeDiscountDto implements PlanVolumeDiscountResult {
  @ApiProperty() thresholdHours!: number;
  @ApiProperty() percentBps!: number;
}

class PlanVersionDto implements PlanVersionResult {
  @ApiProperty() versionNumber!: number;
  @ApiProperty() summary!: string;
  @ApiProperty({ nullable: true, type: String }) changedByAdminId!: string | null;
  @ApiProperty() createdAt!: string;
}

class PlanLifecycleDto implements PlanLifecycleResult {
  @ApiProperty() autoRenewal!: boolean;
  @ApiProperty() billingCycle!: string;
  @ApiProperty() gracePeriodDays!: number;
  @ApiProperty() cancellationNoticeDays!: number;
  @ApiProperty() lastUpdated!: string;
}

class PlanAnalyticsDto implements PlanAnalyticsResult {
  @ApiProperty() subscribers!: number;
  @ApiProperty({ nullable: true, type: Number }) retentionPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) renewalPercent!: number | null;
  @ApiProperty() monthlyRevenueMinor!: number;
}

/** The full plan detail response behind every tab of the Care Plans screen. */
export class ManagedPlanDetailResponseDto implements ManagedPlanDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) coreType!: string | null;
  @ApiProperty() isCore!: boolean;
  @ApiProperty() wiredToCheckout!: boolean;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true, type: String }) targetAudience!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() billingModel!: string;
  @ApiProperty({ type: [String] }) countriesEnabled!: string[];
  @ApiProperty({ type: [String] }) supportedCurrencies!: string[];
  @ApiProperty({ nullable: true, type: Number }) minimumBillingHours!: number | null;
  @ApiProperty({ type: PlanLifecycleDto }) lifecycle!: PlanLifecycleDto;
  @ApiProperty({ type: [PlanPriceStructureDto] }) pricing!: PlanPriceStructureDto[];
  @ApiProperty({ type: [PlanServiceDto] }) services!: PlanServiceDto[];
  @ApiProperty({ type: [PlanVolumeDiscountDto] }) volumeDiscounts!: PlanVolumeDiscountDto[];
  @ApiProperty({ type: [String] }) coverageAreas!: string[];
  @ApiProperty({ type: [String] }) eligibilityRules!: string[];
  @ApiProperty({ nullable: true, type: PlanAnalyticsDto }) analytics!: PlanAnalyticsDto | null;
  @ApiProperty() currentVersion!: number;
  @ApiProperty({ type: [PlanVersionDto] }) versionHistory!: PlanVersionDto[];

  static fromResult(result: ManagedPlanDetailResult): ManagedPlanDetailResponseDto {
    return result;
  }
}
