import { ApiProperty } from '@nestjs/swagger';
import {
  IncidentCaregiverCardResult,
  IncidentDetailResult,
  IncidentRecipientCardResult,
  IncidentRelatedVisitResult,
} from '../../application/dto/incident-detail.result';

class IncidentRecipientCardDto implements IncidentRecipientCardResult {
  @ApiProperty() name!: string;
  @ApiProperty() age!: number;
  @ApiProperty({ nullable: true }) primaryLanguage!: string | null;
  @ApiProperty({ nullable: true }) emergencyContact!: string | null;
  @ApiProperty({ type: [String] }) diagnosedConditions!: string[];
}

class IncidentCaregiverCardDto implements IncidentCaregiverCardResult {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) designation!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
}

class IncidentRelatedVisitDto implements IncidentRelatedVisitResult {
  @ApiProperty() reference!: string;
  @ApiProperty() scheduleLabel!: string;
  @ApiProperty() serviceType!: string;
  @ApiProperty() statusLabel!: string;
}

/** The Incident Detail (Overview tab) response. */
export class IncidentDetailResponseDto implements IncidentDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() incidentType!: string;
  @ApiProperty() priorityLabel!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty() reportedBy!: string;
  @ApiProperty() reportedTime!: string;
  @ApiProperty() reportedAt!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true }) assignedCoordinator!: string | null;
  @ApiProperty({ type: IncidentRecipientCardDto, nullable: true })
  recipient!: IncidentRecipientCardDto | null;
  @ApiProperty({ type: IncidentCaregiverCardDto, nullable: true })
  caregiver!: IncidentCaregiverCardDto | null;
  @ApiProperty({ type: IncidentRelatedVisitDto, nullable: true })
  relatedVisit!: IncidentRelatedVisitDto | null;
  @ApiProperty() generatedAt!: string;

  static fromResult(result: IncidentDetailResult): IncidentDetailResponseDto {
    return result;
  }
}
