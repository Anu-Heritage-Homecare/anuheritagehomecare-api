import { ApiProperty } from '@nestjs/swagger';
import {
  FlexibleHoursAllocationResult,
  SubscriptionDetailResult,
  SubscriptionEventResult,
  SubscriptionNoteResult,
  SubscriptionPaymentResult,
} from '../../application/dto/subscription-detail.result';

class PatientDto {
  @ApiProperty({ nullable: true, type: String }) name!: string | null;
  @ApiProperty({ nullable: true, type: Number }) age!: number | null;
  @ApiProperty({ nullable: true, type: String }) gender!: string | null;
  @ApiProperty({ type: [String] }) conditions!: string[];
}

class PrimaryContactDto {
  @ApiProperty({ nullable: true, type: String }) name!: string | null;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) address!: string | null;
}

class FlexibleHoursAllocationDto implements FlexibleHoursAllocationResult {
  @ApiProperty() allocatedHours!: number;
  @ApiProperty() usedHours!: number;
  @ApiProperty() remainingHours!: number;
  @ApiProperty() percentUsed!: number;
  @ApiProperty({ nullable: true, type: String }) cycleEndsAt!: string | null;
}

class SubscriptionEventDto implements SubscriptionEventResult {
  @ApiProperty() type!: string;
  @ApiProperty() detail!: string;
  @ApiProperty({ nullable: true, type: Number }) hoursDelta!: number | null;
  @ApiProperty({ nullable: true, type: String }) actorAdminId!: string | null;
  @ApiProperty({ nullable: true, type: String }) actorLabel!: string | null;
  @ApiProperty() occurredAt!: string;
}

class SubscriptionNoteDto implements SubscriptionNoteResult {
  @ApiProperty() body!: string;
  @ApiProperty({ nullable: true, type: String }) authorAdminId!: string | null;
  @ApiProperty({ nullable: true, type: String }) authorName!: string | null;
  @ApiProperty() createdAt!: string;
}

class SubscriptionPaymentDto implements SubscriptionPaymentResult {
  @ApiProperty() reference!: string;
  @ApiProperty() provider!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
}

/** The full subscription detail response behind every tab. */
export class SubscriptionDetailResponseDto implements SubscriptionDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty() planType!: string;
  @ApiProperty() planName!: string;
  @ApiProperty() status!: string;
  @ApiProperty() autoRenew!: boolean;
  @ApiProperty() monthlyPriceMinor!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() billingCycle!: string;
  @ApiProperty() contractStartDate!: string;
  @ApiProperty({ nullable: true, type: String }) activationDate!: string | null;
  @ApiProperty({ nullable: true, type: String }) nextRenewalDate!: string | null;
  @ApiProperty({ type: PatientDto }) patient!: PatientDto;
  @ApiProperty({ type: PrimaryContactDto }) primaryContact!: PrimaryContactDto;
  @ApiProperty({ nullable: true, type: String }) coordinatorName!: string | null;
  @ApiProperty({ nullable: true, type: String }) caregiverName!: string | null;
  @ApiProperty({ nullable: true, type: FlexibleHoursAllocationDto })
  flexibleHours!: FlexibleHoursAllocationDto | null;
  @ApiProperty({ type: [SubscriptionEventDto] }) timeline!: SubscriptionEventDto[];
  @ApiProperty({ type: [SubscriptionNoteDto] }) notes!: SubscriptionNoteDto[];
  @ApiProperty({ type: [SubscriptionPaymentDto] }) payments!: SubscriptionPaymentDto[];
  @ApiProperty() hasOverlay!: boolean;

  static fromResult(result: SubscriptionDetailResult): SubscriptionDetailResponseDto {
    return result;
  }
}
