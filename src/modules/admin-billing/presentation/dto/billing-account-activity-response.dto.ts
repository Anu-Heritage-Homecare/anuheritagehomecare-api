import { ApiProperty } from '@nestjs/swagger';
import { BillingAccountEventType } from '../../application/ports/billing-accounts-read.port';
import {
  BillingAccountActivityEventResult,
  BillingAccountActivityResult,
} from '../../application/dto/billing-account-activity.result';

class BillingAccountActivityEventDto implements BillingAccountActivityEventResult {
  @ApiProperty({ enum: ['PAYMENT_RECORDED', 'INVOICE_ISSUED', 'CARE_RECIPIENT_LINKED'] })
  type!: BillingAccountEventType;
  @ApiProperty() title!: string;
  @ApiProperty() at!: string;
  @ApiProperty({ nullable: true, type: Number }) amountMinor!: number | null;
  @ApiProperty({ nullable: true, type: String }) methodLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) invoiceNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) periodStart!: string | null;
  @ApiProperty({ nullable: true, type: String }) periodEnd!: string | null;
  @ApiProperty({ nullable: true, type: String }) recipientName!: string | null;
  @ApiProperty({ nullable: true, type: String }) performedBy!: string | null;
}

/** The Activity tab of a billing account. */
export class BillingAccountActivityResponseDto implements BillingAccountActivityResult {
  @ApiProperty({ nullable: true, type: String }) currency!: string | null;
  @ApiProperty({ type: [BillingAccountActivityEventDto] })
  events!: BillingAccountActivityEventDto[];
  @ApiProperty() total!: number;

  static fromResult(result: BillingAccountActivityResult): BillingAccountActivityResponseDto {
    return result;
  }
}
