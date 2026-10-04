import { ApiProperty } from '@nestjs/swagger';
import {
  AssignCandidateResult,
  AssignCandidatesResult,
  AssignVisitHeaderResult,
  CandidateAvailabilityResult,
  CandidateCertificationResult,
  CandidateEligibilityResult,
} from '../../application/dto/assign-candidates.result';

class AssignVisitHeaderDto implements AssignVisitHeaderResult {
  @ApiProperty() id!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty() serviceType!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() date!: string;
  @ApiProperty() time!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() durationHours!: number;
  @ApiProperty() location!: string;
}

class AvailabilityDto implements CandidateAvailabilityResult {
  @ApiProperty() status!: 'AVAILABLE' | 'AVAILABLE_LATER' | 'BUSY' | 'OFF_DUTY';
  @ApiProperty() label!: string;
}

class EligibilityDto implements CandidateEligibilityResult {
  @ApiProperty() status!: 'OK' | 'WARN' | 'BLOCKED_CONFLICT' | 'INELIGIBLE';
  @ApiProperty() assignable!: boolean;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
}

class CertificationDto implements CandidateCertificationResult {
  @ApiProperty() name!: string;
  @ApiProperty() valid!: boolean;
}

class LoadDto {
  @ApiProperty() completed!: number;
  @ApiProperty() total!: number;
  @ApiProperty() label!: string;
}

class CandidateDto implements AssignCandidateResult {
  @ApiProperty() caregiverId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) branch!: string | null;
  @ApiProperty() bestMatch!: boolean;
  @ApiProperty() matchScore!: number;
  @ApiProperty({ type: AvailabilityDto }) availability!: AvailabilityDto;
  @ApiProperty({ nullable: true, type: Number }) distanceMiles!: number | null;
  @ApiProperty({ type: LoadDto }) load!: LoadDto;
  @ApiProperty({ nullable: true, type: Number }) rating!: number | null;
  @ApiProperty({ type: [CertificationDto] }) certifications!: CertificationDto[];
  @ApiProperty({ type: [String] }) skills!: string[];
  @ApiProperty({ type: EligibilityDto }) eligibility!: EligibilityDto;
}

/** The Assign Caregiver screen response. */
export class AssignCandidatesResponseDto implements AssignCandidatesResult {
  @ApiProperty({ type: AssignVisitHeaderDto }) visit!: AssignVisitHeaderDto;
  @ApiProperty({ nullable: true, type: String }) requiredCertification!: string | null;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [CandidateDto] }) candidates!: CandidateDto[];

  static fromResult(result: AssignCandidatesResult): AssignCandidatesResponseDto {
    return result;
  }
}
