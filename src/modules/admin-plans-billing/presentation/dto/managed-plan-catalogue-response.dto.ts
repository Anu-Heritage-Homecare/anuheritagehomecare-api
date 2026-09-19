import { ApiProperty } from '@nestjs/swagger';
import {
  ManagedPlanCardResult,
  ManagedPlanCatalogueResult,
} from '../../application/dto/managed-plan-catalogue.result';

class ManagedPlanCardDto implements ManagedPlanCardResult {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) coreType!: string | null;
  @ApiProperty() isCore!: boolean;
  @ApiProperty() wiredToCheckout!: boolean;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() status!: string;
  @ApiProperty() billingModel!: string;
  @ApiProperty({ nullable: true, type: Number }) monthlyPriceMinor!: number | null;
  @ApiProperty() currency!: string;
  @ApiProperty() subscribers!: number;
  @ApiProperty({ nullable: true, type: Number }) retentionPercent!: number | null;
  @ApiProperty() estRevenueMinor!: number;
}

/** The Active Care Plan Catalogue response. */
export class ManagedPlanCatalogueResponseDto implements ManagedPlanCatalogueResult {
  @ApiProperty() currency!: string;
  @ApiProperty({ type: [ManagedPlanCardDto] }) plans!: ManagedPlanCardDto[];

  static fromResult(result: ManagedPlanCatalogueResult): ManagedPlanCatalogueResponseDto {
    return result;
  }
}
