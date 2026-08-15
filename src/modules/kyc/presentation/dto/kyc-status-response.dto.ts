import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatusResult } from '../../application/dto/kyc.result';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycStatus } from '../../domain/kyc-status.enum';

/** HTTP response for an owner's KYC state. Never exposes the full document. */
export class KycStatusResponseDto {
  @ApiProperty({ description: 'Whether verification has been started' })
  started!: boolean;

  @ApiPropertyOptional({ enum: KycStatus, enumName: 'KycStatus', nullable: true })
  status!: KycStatus | null;

  @ApiPropertyOptional({ enum: KycDocumentType, enumName: 'KycDocumentType', nullable: true })
  documentType!: KycDocumentType | null;

  @ApiPropertyOptional({ nullable: true, description: 'Last four of the verified document' })
  maskedReference!: string | null;

  @ApiPropertyOptional({ nullable: true })
  verifiedAt!: string | null;

  static fromResult(result: KycStatusResult): KycStatusResponseDto {
    const dto = new KycStatusResponseDto();
    dto.started = result.started;
    dto.status = result.status;
    dto.documentType = result.documentType;
    dto.maskedReference = result.maskedReference;
    dto.verifiedAt = result.verifiedAt;
    return dto;
  }
}
