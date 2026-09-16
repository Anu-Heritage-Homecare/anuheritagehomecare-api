import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicationDetailResult,
  ApplicationDocumentResult,
} from '../../application/dto/application-detail.result';

class ApplicationDocumentDto implements ApplicationDocumentResult {
  @ApiProperty() label!: string;
  @ApiProperty() key!: string;
}

/** The Care Request detail panel response. */
export class ApplicationDetailResponseDto implements ApplicationDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() familyName!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ nullable: true, type: String }) selectedPlanType!: string | null;
  @ApiProperty({ nullable: true, type: String }) planName!: string | null;
  @ApiProperty({ nullable: true, type: Number }) monthlyPriceMinor!: number | null;
  @ApiProperty() currency!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() paymentStatus!: string;
  @ApiProperty() docsStatus!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) coordinatorName!: string | null;
  @ApiProperty() submittedAt!: string;
  @ApiProperty({ nullable: true, type: Number }) patientAge!: number | null;
  @ApiProperty({ nullable: true, type: String }) patientGender!: string | null;
  @ApiProperty({ type: [String] }) patientConditions!: string[];
  @ApiProperty({ nullable: true, type: String }) contactName!: string | null;
  @ApiProperty({ nullable: true, type: String }) contactPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) contactEmail!: string | null;
  @ApiProperty({ nullable: true, type: String }) contactAddress!: string | null;
  @ApiProperty({ nullable: true, type: Number }) requestedHoursPerWeek!: number | null;
  @ApiProperty({ nullable: true, type: String }) requestedSchedule!: string | null;
  @ApiProperty({ nullable: true, type: String }) specialNeeds!: string | null;
  @ApiProperty({ type: [ApplicationDocumentDto] }) documents!: ApplicationDocumentDto[];

  static fromResult(result: ApplicationDetailResult): ApplicationDetailResponseDto {
    return result;
  }
}
