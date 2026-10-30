import { ApiProperty } from '@nestjs/swagger';
import {
  BillingAccountResult,
  BillingAccountsListResult,
  BillingAccountsTabCountsResult,
} from '../../application/dto/billing-accounts.result';

class BillingAccountsTabCountsDto implements BillingAccountsTabCountsResult {
  @ApiProperty() all!: number;
  @ApiProperty() outstanding!: number;
  @ApiProperty() inactive!: number;
}

class BillingAccountDto implements BillingAccountResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty() primaryContact!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) branch!: string | null;
  @ApiProperty() recipientCount!: number;
  @ApiProperty() outstandingMinor!: number;
  @ApiProperty({ nullable: true, type: String }) currency!: string | null;
  @ApiProperty({ nullable: true, type: String }) lastPaymentAt!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() billingStatus!: string;
}

/** The Billing Accounts list response. */
export class BillingAccountsResponseDto implements BillingAccountsListResult {
  @ApiProperty({ type: BillingAccountsTabCountsDto }) tabs!: BillingAccountsTabCountsDto;
  @ApiProperty({ type: [String] }) branches!: string[];
  @ApiProperty({ type: [BillingAccountDto] }) accounts!: BillingAccountDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;

  static fromResult(result: BillingAccountsListResult): BillingAccountsResponseDto {
    return result;
  }
}
