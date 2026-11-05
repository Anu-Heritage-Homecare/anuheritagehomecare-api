import { ApiProperty } from '@nestjs/swagger';
import {
  BillingAccountRecipientResult,
  BillingAccountRecipientsResult,
} from '../../application/dto/billing-account-recipients.result';

class BillingAccountRecipientDto implements BillingAccountRecipientResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) photoKey!: string | null;
  @ApiProperty() relationship!: string;
  @ApiProperty({ nullable: true, type: String }) servicePlan!: string | null;
  @ApiProperty({ nullable: true, type: Number }) monthlyCostMinor!: number | null;
  @ApiProperty({ nullable: true, type: String }) currency!: string | null;
  @ApiProperty({ nullable: true, type: String }) startDate!: string | null;
  @ApiProperty() status!: string;
}

/** The Care Recipients tab of a billing account. */
export class BillingAccountRecipientsResponseDto implements BillingAccountRecipientsResult {
  @ApiProperty({ type: [BillingAccountRecipientDto] }) recipients!: BillingAccountRecipientDto[];
  @ApiProperty() total!: number;

  static fromResult(result: BillingAccountRecipientsResult): BillingAccountRecipientsResponseDto {
    return result;
  }
}
