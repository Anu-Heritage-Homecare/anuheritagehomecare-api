import { ApiProperty } from '@nestjs/swagger';
import {
  BillingInvoiceServiceResult,
  BillingInvoiceServicesResult,
} from '../../application/dto/billing-invoice-services.result';

class BillingInvoiceServiceDto implements BillingInvoiceServiceResult {
  @ApiProperty() serviceName!: string;
  @ApiProperty({ nullable: true, type: String }) category!: string | null;
  @ApiProperty({ nullable: true, type: Number }) hoursUnits!: number | null;
  @ApiProperty({ nullable: true, type: String }) unit!: string | null;
  @ApiProperty({ nullable: true, type: Number }) rateMinor!: number | null;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ nullable: true, type: String }) serviceDateStart!: string | null;
  @ApiProperty({ nullable: true, type: String }) serviceDateEnd!: string | null;
  @ApiProperty({ nullable: true, type: String }) assignedCaregiver!: string | null;
}

/** The Services tab of an invoice. */
export class BillingInvoiceServicesResponseDto implements BillingInvoiceServicesResult {
  @ApiProperty() currency!: string;
  @ApiProperty() servicePeriodStart!: string;
  @ApiProperty() servicePeriodEnd!: string;
  @ApiProperty({ type: [BillingInvoiceServiceDto] }) services!: BillingInvoiceServiceDto[];
  @ApiProperty() distinctCount!: number;
  @ApiProperty() summaryAmountMinor!: number;

  static fromResult(result: BillingInvoiceServicesResult): BillingInvoiceServicesResponseDto {
    return result;
  }
}
