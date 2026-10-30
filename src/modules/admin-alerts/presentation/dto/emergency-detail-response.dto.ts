import { ApiProperty } from '@nestjs/swagger';
import {
  EmergencyDetailResult,
  EmergencyDetailsResult,
  EmergencyProtocolStepResult,
  EmergencyTimelineEntryResult,
} from '../../application/dto/emergency-detail.result';

class EmergencyDetailsDto implements EmergencyDetailsResult {
  @ApiProperty() caregiver!: string;
  @ApiProperty() careRecipient!: string;
  @ApiProperty() visit!: string;
  @ApiProperty() location!: string;
  @ApiProperty() timeTriggered!: string;
  @ApiProperty() triggeredAt!: string;
  @ApiProperty() durationLabel!: string;
  @ApiProperty({ nullable: true }) assignedTo!: string | null;
}

class EmergencyProtocolStepDto implements EmergencyProtocolStepResult {
  @ApiProperty() step!: string;
  @ApiProperty() label!: string;
  @ApiProperty() completed!: boolean;
}

class EmergencyTimelineEntryDto implements EmergencyTimelineEntryResult {
  @ApiProperty() at!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty() description!: string;
  @ApiProperty() kind!: string;
}

/** The Emergencies tab detail response. */
export class EmergencyDetailResponseDto implements EmergencyDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() title!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty() critical!: boolean;
  @ApiProperty({ type: EmergencyDetailsDto }) details!: EmergencyDetailsDto;
  @ApiProperty({ type: [EmergencyProtocolStepDto] }) protocol!: EmergencyProtocolStepDto[];
  @ApiProperty({ type: [EmergencyTimelineEntryDto] }) timeline!: EmergencyTimelineEntryDto[];
  @ApiProperty() generatedAt!: string;

  static fromResult(result: EmergencyDetailResult): EmergencyDetailResponseDto {
    return result;
  }
}
