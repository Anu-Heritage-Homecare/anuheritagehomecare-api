import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatusResult } from '../../application/dto/kyc.result';
import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycStatus } from '../../domain/kyc-status.enum';

/**
 * HTTP response for an owner's KYC state. Never exposes the full document, the
 * selfie, or the provider's returned values; only the names of the fields that
 * did not match are surfaced so the app can tell the owner what to correct.
 */
export class KycStatusResponseDto {
  @ApiProperty({ description: 'Whether verification has been started' })
  started!: boolean;

  @ApiPropertyOptional({ enum: KycStatus, enumName: 'KycStatus', nullable: true })
  status!: KycStatus | null;

  @ApiPropertyOptional({ enum: KycDocumentType, enumName: 'KycDocumentType', nullable: true })
  documentType!: KycDocumentType | null;

  @ApiPropertyOptional({ nullable: true, description: 'Last four of the verified document' })
  maskedReference!: string | null;

  @ApiPropertyOptional({ enum: FaceMatchOutcome, enumName: 'FaceMatchOutcome', nullable: true })
  faceMatch!: FaceMatchOutcome | null;

  @ApiProperty({
    type: [String],
    description: 'Names of the fields that did not match, when rejected',
    example: ['lastName', 'dateOfBirth'],
  })
  mismatchedFields!: string[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Client secret to run the provider SDK (US), returned only on submit',
  })
  clientSecret!: string | null;

  @ApiPropertyOptional({ nullable: true })
  verifiedAt!: string | null;

  static fromResult(result: KycStatusResult): KycStatusResponseDto {
    const dto = new KycStatusResponseDto();
    dto.started = result.started;
    dto.status = result.status;
    dto.documentType = result.documentType;
    dto.maskedReference = result.maskedReference;
    dto.faceMatch = result.faceMatch;
    dto.mismatchedFields = result.mismatchedFields;
    dto.clientSecret = result.clientSecret;
    dto.verifiedAt = result.verifiedAt;
    return dto;
  }
}
