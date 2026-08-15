import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';

/**
 * Request contract to submit identity documents. Provide `ssnLast4` for the US
 * (SSN_LAST4) or `idNumber` for Nigeria (NIN or PASSPORT). These values are
 * sensitive and are excluded from logs.
 */
export class SubmitKycRequestDto {
  @ApiProperty({ example: 'Ada Obi', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ enum: KycDocumentType, enumName: 'KycDocumentType' })
  @IsIn(Object.values(KycDocumentType))
  documentType!: string;

  @ApiPropertyOptional({ example: '6789', description: 'Last four of the SSN (US)' })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'ssnLast4 must be four digits' })
  ssnLast4?: string;

  @ApiPropertyOptional({ example: '12345678901', description: 'NIN or passport number (Nigeria)' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(40)
  idNumber?: string;
}
