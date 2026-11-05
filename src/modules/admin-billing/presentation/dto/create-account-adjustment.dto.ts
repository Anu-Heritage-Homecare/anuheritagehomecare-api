import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { Currency } from '@shared/domain/currency.enum';
import {
  ALL_ACCOUNT_ADJUSTMENT_CATEGORIES,
  AccountAdjustmentCategory,
} from '../../domain/account-adjustment-category.enum';
import {
  ALL_ACCOUNT_ADJUSTMENT_STATUSES,
  AccountAdjustmentStatus,
} from '../../domain/account-adjustment-status.enum';
import { AccountAdjustmentCreatedResult } from '../../application/dto/account-adjustments.result';
import { ApproveAccountAdjustmentResult } from '../../application/use-cases/approve-account-adjustment.use-case';
import { ReverseAccountAdjustmentResult } from '../../application/use-cases/reverse-account-adjustment.use-case';

/** The Create Adjustment drawer: a new financial correction against a billing account. */
export class CreateAccountAdjustmentRequestDto {
  @ApiProperty({ enum: ALL_ACCOUNT_ADJUSTMENT_CATEGORIES })
  @IsEnum(AccountAdjustmentCategory)
  category!: AccountAdjustmentCategory;

  @ApiProperty({ maxLength: 80, example: 'Account Credit' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  type!: string;

  @ApiProperty({ description: 'The billing account (family directory entry) id' })
  @IsUUID()
  billingAccountId!: string;

  @ApiProperty({ minimum: 1, description: 'Amount in the currency minor units' })
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @ApiProperty({ enum: Object.values(Currency) })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class AccountAdjustmentCreatedDto implements AccountAdjustmentCreatedResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'CRD-2026-001' }) reference!: string;
  @ApiProperty() createdAt!: string;
}

/** The outcome of approving an adjustment: its new status. */
export class AccountAdjustmentApprovedDto implements ApproveAccountAdjustmentResult {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ALL_ACCOUNT_ADJUSTMENT_STATUSES }) status!: AccountAdjustmentStatus;
}

/** The outcome of reversing an adjustment: its new status. */
export class AccountAdjustmentReversedDto implements ReverseAccountAdjustmentResult {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ALL_ACCOUNT_ADJUSTMENT_STATUSES }) status!: AccountAdjustmentStatus;
}
