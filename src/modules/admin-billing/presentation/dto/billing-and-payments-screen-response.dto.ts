import { ApiProperty } from '@nestjs/swagger';
import {
  BillingAndPaymentsScreenResult,
  BillingPaymentTermResult,
  BillingTaxResult,
} from '../../application/dto/billing-and-payments-screen.result';
import { TaxScope } from '../../domain/tax-scope.enum';
import { BillingSettingsResponseDto } from './billing-settings-response.dto';

class BillingTaxDto implements BillingTaxResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'VAT' }) name!: string;
  @ApiProperty({ example: 7.5 }) ratePercent!: number;
  @ApiProperty({ enum: TaxScope }) scope!: TaxScope;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
}

class BillingPaymentTermDto implements BillingPaymentTermResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Net 30' }) name!: string;
  @ApiProperty({ nullable: true, type: Number, example: 30 }) netDays!: number | null;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isCustom!: boolean;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
}

/** The whole Billing & Payments settings screen (settings plus taxes, terms, next number). */
export class BillingAndPaymentsScreenResponseDto
  extends BillingSettingsResponseDto
  implements BillingAndPaymentsScreenResult
{
  @ApiProperty({ type: [BillingTaxDto] }) taxes!: BillingTaxDto[];
  @ApiProperty({ type: [BillingPaymentTermDto] }) paymentTerms!: BillingPaymentTermDto[];
  @ApiProperty({ example: '2026-0458' }) nextInvoiceNumber!: string;

  static fromScreen(result: BillingAndPaymentsScreenResult): BillingAndPaymentsScreenResponseDto {
    return result;
  }
}
