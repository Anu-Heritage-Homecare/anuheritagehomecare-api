import { ApiProperty } from '@nestjs/swagger';
import { InvoiceCreatedResult } from '../../application/dto/invoice-created.result';

/** The invoice raised by the Create Invoice wizard (step 5). */
export class InvoiceCreatedResponseDto implements InvoiceCreatedResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INV-2026-451' }) invoiceNumber!: string;
  @ApiProperty({ example: 'PENDING' }) status!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() issueDate!: string;
  @ApiProperty() dueDate!: string;
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiProperty() subtotalMinor!: number;
  @ApiProperty() discountTotalMinor!: number;
  @ApiProperty() taxMinor!: number;
  @ApiProperty({ example: 7.5 }) taxRatePercent!: number;
  @ApiProperty() totalMinor!: number;

  static fromResult(result: InvoiceCreatedResult): InvoiceCreatedResponseDto {
    return result;
  }
}
