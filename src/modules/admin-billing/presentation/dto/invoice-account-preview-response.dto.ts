import { ApiProperty } from '@nestjs/swagger';
import { InvoiceAccountPreviewResult } from '../../application/dto/invoice-wizard.result';

/** The Account Details Preview card on step 1 of the Create Invoice wizard. */
export class InvoiceAccountPreviewResponseDto implements InvoiceAccountPreviewResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'ACC-2026-081' }) accountNumber!: string;
  @ApiProperty({ example: 'Adeyemi Family Account' }) name!: string;
  @ApiProperty({ example: 'ACTIVE' }) status!: string;
  @ApiProperty({ example: 'Tunde Adeyemi' }) primaryContactName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Son' })
  primaryContactRelationship!: string | null;
  @ApiProperty({ nullable: true, type: String }) contactEmail!: string | null;
  @ApiProperty({ nullable: true, type: String }) contactPhone!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'Victoria Island, Lagos' })
  billingAddress!: string | null;
  @ApiProperty() outstandingBalanceMinor!: number;
  @ApiProperty({ nullable: true, type: String }) currency!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'INV-2026-412' })
  lastInvoiceNumber!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'PAID' })
  lastInvoiceStatus!: string | null;

  static fromResult(result: InvoiceAccountPreviewResult): InvoiceAccountPreviewResponseDto {
    return result;
  }
}
