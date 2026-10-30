import { ApiProperty } from '@nestjs/swagger';
import {
  IncidentCommunicationRowResult,
  IncidentCommunicationsResult,
  QuickContactBookResult,
  QuickContactResult,
} from '../../application/dto/incident-communications.result';

class IncidentCommunicationRowDto implements IncidentCommunicationRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() at!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty() dayLabel!: string;
  @ApiProperty() timestampLabel!: string;
  @ApiProperty() contactName!: string;
  @ApiProperty({ nullable: true }) contactRole!: string | null;
  @ApiProperty() channel!: string;
  @ApiProperty() channelLabel!: string;
  @ApiProperty() outcome!: string;
  @ApiProperty() outcomeLabel!: string;
  @ApiProperty({ nullable: true }) notes!: string | null;
}

class QuickContactDto implements QuickContactResult {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) subtitle!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
}

class QuickContactBookDto implements QuickContactBookResult {
  @ApiProperty({ type: QuickContactDto, nullable: true })
  familyEmergencyContact!: QuickContactDto | null;
  @ApiProperty({ type: QuickContactDto, nullable: true })
  assignedCaregiver!: QuickContactDto | null;
  @ApiProperty({ type: QuickContactDto, nullable: true })
  escalationSupervisor!: QuickContactDto | null;
}

/** The Incident Detail Communication tab response. */
export class IncidentCommunicationsResponseDto implements IncidentCommunicationsResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ type: [IncidentCommunicationRowDto] })
  communications!: IncidentCommunicationRowDto[];
  @ApiProperty({ type: QuickContactBookDto }) contactBook!: QuickContactBookDto;
  @ApiProperty() generatedAt!: string;

  static fromResult(result: IncidentCommunicationsResult): IncidentCommunicationsResponseDto {
    return result;
  }
}
