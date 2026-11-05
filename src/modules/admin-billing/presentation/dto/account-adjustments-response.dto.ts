import { ApiProperty } from '@nestjs/swagger';
import {
  AccountAdjustmentRowResult,
  AccountAdjustmentsListResult,
} from '../../application/dto/account-adjustments.result';
import {
  ALL_ACCOUNT_ADJUSTMENT_CATEGORIES,
  AccountAdjustmentCategory,
} from '../../domain/account-adjustment-category.enum';
import {
  ALL_ACCOUNT_ADJUSTMENT_STATUSES,
  AccountAdjustmentStatus,
} from '../../domain/account-adjustment-status.enum';
import { AccountAdjustmentCounts } from '../../application/ports/account-adjustments-read.port';

class AccountAdjustmentCountsDto implements AccountAdjustmentCounts {
  @ApiProperty() credits!: number;
  @ApiProperty() refunds!: number;
  @ApiProperty() writeOffs!: number;
  @ApiProperty() adjustments!: number;
}

class AccountAdjustmentRowDto implements AccountAdjustmentRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'CRD-2026-001' }) reference!: string;
  @ApiProperty({ enum: ALL_ACCOUNT_ADJUSTMENT_CATEGORIES }) category!: AccountAdjustmentCategory;
  @ApiProperty({ example: 'Account Credit' }) type!: string;
  @ApiProperty() billingAccountId!: string;
  @ApiProperty({ nullable: true, type: String }) billingAccountName!: string | null;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ example: 'Uncollectible historical arrears' }) reason!: string;
  @ApiProperty({ enum: ALL_ACCOUNT_ADJUSTMENT_STATUSES }) status!: AccountAdjustmentStatus;
  @ApiProperty() createdAt!: string;
}

/** The Credits & Adjustments list. */
export class AccountAdjustmentsResponseDto implements AccountAdjustmentsListResult {
  @ApiProperty({ type: [AccountAdjustmentRowDto] }) adjustments!: AccountAdjustmentRowDto[];
  @ApiProperty({ type: AccountAdjustmentCountsDto }) tabs!: AccountAdjustmentCountsDto;
  @ApiProperty({ type: [String] }) types!: string[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;

  static fromResult(result: AccountAdjustmentsListResult): AccountAdjustmentsResponseDto {
    return result;
  }
}
