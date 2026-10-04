import { ApiProperty } from '@nestjs/swagger';
import {
  CaregiverComplianceSummaryResult,
  CaregiverCredentialResult,
  CaregiverDocumentUploadResult,
  CaregiverDocumentsTabResult,
  CaregiverEmploymentDocumentResult,
  CaregiverRenewalResult,
  CaregiverTrainingRecordResult,
} from '../../application/dto/caregiver-documents.result';

class ImpendingExpiryDto {
  @ApiProperty() name!: string;
  @ApiProperty() expiresAt!: string;
  @ApiProperty() daysRemaining!: number;
}

class ComplianceSummaryDto implements CaregiverComplianceSummaryResult {
  @ApiProperty() overallStatus!: string;
  @ApiProperty() message!: string;
  @ApiProperty() requirementsMet!: number;
  @ApiProperty() requirementsTotal!: number;
  @ApiProperty({ nullable: true, type: String }) credentialingValidUntil!: string | null;
  @ApiProperty({ nullable: true, type: ImpendingExpiryDto })
  nextImpendingExpiry!: ImpendingExpiryDto | null;
  @ApiProperty() documentsOnFile!: number;
  @ApiProperty({ nullable: true, type: String }) lastUpdated!: string | null;
}

class RenewalDto implements CaregiverRenewalResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() expiresAt!: string;
  @ApiProperty() monthsAway!: number;
  @ApiProperty() urgency!: 'REQUIRED' | 'UPCOMING' | 'VALID';
  @ApiProperty() label!: string;
}

class CredentialDto implements CaregiverCredentialResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() kind!: string;
  @ApiProperty({ nullable: true, type: String }) licenseNumber!: string | null;
  @ApiProperty({ nullable: true, type: String }) issued!: string | null;
  @ApiProperty() expires!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) fileName!: string | null;
  @ApiProperty() hasDocument!: boolean;
}

class EmploymentDocumentDto implements CaregiverEmploymentDocumentResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) date!: string | null;
  @ApiProperty({ nullable: true, type: String }) fileName!: string | null;
  @ApiProperty() hasDocument!: boolean;
}

class TrainingRecordDto implements CaregiverTrainingRecordResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) completed!: string | null;
  @ApiProperty() certificate!: boolean;
  @ApiProperty() hoursLabel!: string;
  @ApiProperty() hasCertificate!: boolean;
}

class UploadHistoryDto implements CaregiverDocumentUploadResult {
  @ApiProperty() date!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) fileName!: string | null;
  @ApiProperty({ nullable: true, type: String }) uploadedBy!: string | null;
}

/** The caregiver Documents tab response. */
export class CaregiverDocumentsResponseDto implements CaregiverDocumentsTabResult {
  @ApiProperty({ type: ComplianceSummaryDto }) summary!: ComplianceSummaryDto;
  @ApiProperty({ type: [CredentialDto] }) certifications!: CredentialDto[];
  @ApiProperty({ type: [EmploymentDocumentDto] }) employmentDocuments!: EmploymentDocumentDto[];
  @ApiProperty({ type: [TrainingRecordDto] }) trainingRecords!: TrainingRecordDto[];
  @ApiProperty({ type: [RenewalDto] }) upcomingRenewals!: RenewalDto[];
  @ApiProperty({ type: [UploadHistoryDto] }) uploadHistory!: UploadHistoryDto[];

  static fromResult(result: CaregiverDocumentsTabResult): CaregiverDocumentsResponseDto {
    return result;
  }
}
