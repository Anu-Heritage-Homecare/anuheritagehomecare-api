import { ApiProperty } from '@nestjs/swagger';
import {
  RenewalEntryResult,
  RenewalGroupResult,
  RenewalsResult,
} from '../../application/dto/renewals.result';

class RenewalEntryDto implements RenewalEntryResult {
  @ApiProperty() subscriptionId!: string;
  @ApiProperty({ nullable: true, type: String }) clientName!: string | null;
  @ApiProperty() planName!: string;
  @ApiProperty() renewalDate!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
}

class RenewalGroupDto implements RenewalGroupResult {
  @ApiProperty() window!: string;
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
  @ApiProperty() totalMinor!: number;
  @ApiProperty({ type: [RenewalEntryDto] }) entries!: RenewalEntryDto[];
}

/** The Upcoming Renewals Timeline response for one currency. */
export class RenewalsResponseDto implements RenewalsResult {
  @ApiProperty() currency!: string;
  @ApiProperty() generatedAt!: string;
  @ApiProperty() scanned!: number;
  @ApiProperty() capped!: boolean;
  @ApiProperty({ type: [RenewalGroupDto] }) groups!: RenewalGroupDto[];

  static fromResult(result: RenewalsResult): RenewalsResponseDto {
    return result;
  }
}
