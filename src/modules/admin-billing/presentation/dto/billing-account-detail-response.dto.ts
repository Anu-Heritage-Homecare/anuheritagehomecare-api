import { ApiProperty } from '@nestjs/swagger';
import {
  BillingAccountDetailResult,
  BillingAccountEventResult,
  BillingAccountFinancialResult,
  BillingAccountInvoiceResult,
  BillingAccountSummaryResult,
} from '../../application/dto/billing-account-detail.result';

class BillingAccountSummaryDto implements BillingAccountSummaryResult {
  @ApiProperty() reference!: string;
  @ApiProperty() createdDate!: string;
  @ApiProperty({ nullable: true, type: String }) branch!: string | null;
  @ApiProperty({ nullable: true, type: String }) paymentTerms!: string | null;
  @ApiProperty({ nullable: true, type: String }) preferredMethod!: string | null;
}

class BillingAccountFinancialDto implements BillingAccountFinancialResult {
  @ApiProperty({ nullable: true, type: String }) currency!: string | null;
  @ApiProperty() outstandingMinor!: number;
  @ApiProperty() totalBilledMinor!: number;
  @ApiProperty() totalPaidMinor!: number;
  @ApiProperty({ nullable: true, type: String }) lastPaymentAt!: string | null;
}

class BillingAccountInvoiceDto implements BillingAccountInvoiceResult {
  @ApiProperty() number!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ nullable: true, type: String }) dueDate!: string | null;
  @ApiProperty() status!: string;
}

class BillingAccountEventDto implements BillingAccountEventResult {
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() at!: string;
  @ApiProperty({ nullable: true, type: Number }) amountMinor!: number | null;
  @ApiProperty({ nullable: true, type: String }) methodLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) invoiceNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) recipientName!: string | null;
}

/** The Billing Account detail (Overview tab) response. */
export class BillingAccountDetailResponseDto implements BillingAccountDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty() primaryContact!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ type: BillingAccountSummaryDto }) summary!: BillingAccountSummaryDto;
  @ApiProperty({ type: BillingAccountFinancialDto }) financial!: BillingAccountFinancialDto;
  @ApiProperty({ type: [BillingAccountInvoiceDto] }) recentInvoices!: BillingAccountInvoiceDto[];
  @ApiProperty({ type: [BillingAccountEventDto] }) timeline!: BillingAccountEventDto[];

  static fromResult(result: BillingAccountDetailResult): BillingAccountDetailResponseDto {
    return result;
  }
}
