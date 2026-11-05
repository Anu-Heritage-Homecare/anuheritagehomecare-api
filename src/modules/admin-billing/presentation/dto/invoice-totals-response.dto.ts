import { ApiProperty } from '@nestjs/swagger';
import {
  AppliedAmountResult,
  InvoiceTotalsResult,
} from '../../application/dto/invoice-totals.result';

class AppliedAmountDto implements AppliedAmountResult {
  @ApiProperty() label!: string;
  @ApiProperty() amountMinor!: number;
}

/** The computed invoice totals breakdown (Create Invoice wizard, step 4). */
export class InvoiceTotalsResponseDto implements InvoiceTotalsResult {
  @ApiProperty() currency!: string;
  @ApiProperty() subtotalMinor!: number;
  @ApiProperty({ type: [AppliedAmountDto] }) discounts!: AppliedAmountDto[];
  @ApiProperty() discountTotalMinor!: number;
  @ApiProperty({ type: [AppliedAmountDto] }) adjustments!: AppliedAmountDto[];
  @ApiProperty() adjustmentTotalMinor!: number;
  @ApiProperty() taxableBaseMinor!: number;
  @ApiProperty({ example: 7.5 }) taxRatePercent!: number;
  @ApiProperty() vatMinor!: number;
  @ApiProperty() totalMinor!: number;

  static fromResult(result: InvoiceTotalsResult): InvoiceTotalsResponseDto {
    return result;
  }
}
