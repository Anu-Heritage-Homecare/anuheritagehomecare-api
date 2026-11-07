import { ApiProperty } from '@nestjs/swagger';
import {
  AccountPreviewContactResult,
  AccountPreviewFinancialResult,
  AccountPreviewInvoiceResult,
  AccountPreviewRecipientResult,
  AccountPreviewResult,
} from '../../application/dto/account-preview.result';

class AccountPreviewContactDto implements AccountPreviewContactResult {
  @ApiProperty({ example: 'Babatunde Adeyemi' }) name!: string;
  @ApiProperty({ nullable: true, type: String, example: 'babatunde@adeyemifamily.com' })
  email!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '+234 803 123 4567' })
  phone!: string | null;
}

class AccountPreviewFinancialDto implements AccountPreviewFinancialResult {
  @ApiProperty({ nullable: true, type: String, example: 'NGN' }) currency!: string | null;
  @ApiProperty({ example: 45_000_000 }) outstandingMinor!: number;
  @ApiProperty({ example: 420_000_000 }) totalBilledMinor!: number;
  @ApiProperty({ nullable: true, type: String }) lastPaymentAt!: string | null;
}

class AccountPreviewRecipientDto implements AccountPreviewRecipientResult {
  @ApiProperty({ example: 'Adebola Adeyemi' }) name!: string;
  @ApiProperty({ example: 'Grandmother' }) relationship!: string;
}

class AccountPreviewInvoiceDto implements AccountPreviewInvoiceResult {
  @ApiProperty({ example: 'INV-2026-451' }) number!: string;
  @ApiProperty({ example: 45_000_000 }) amountMinor!: number;
  @ApiProperty({ nullable: true, type: String }) dueDate!: string | null;
  @ApiProperty({ example: 'AWAITING_PAYMENT' }) status!: string;
}

/** The Account Preview drawer opened from the Billing Accounts list. */
export class AccountPreviewResponseDto implements AccountPreviewResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Adeyemi Family Account' }) accountName!: string;
  @ApiProperty({ example: 'ACC-2026-0812' }) reference!: string;
  @ApiProperty({ example: 'ACTIVE' }) status!: string;
  @ApiProperty({ type: AccountPreviewContactDto }) primaryContact!: AccountPreviewContactDto;
  @ApiProperty({ type: AccountPreviewFinancialDto }) financial!: AccountPreviewFinancialDto;
  @ApiProperty({ type: [AccountPreviewRecipientDto] })
  linkedRecipients!: AccountPreviewRecipientDto[];
  @ApiProperty({ type: [AccountPreviewInvoiceDto] }) recentInvoices!: AccountPreviewInvoiceDto[];

  static fromResult(result: AccountPreviewResult): AccountPreviewResponseDto {
    return result;
  }
}
