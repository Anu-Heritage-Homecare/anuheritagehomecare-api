import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';

/** Largest accepted base64 selfie (about 2 MB of image data). */
const MAX_FACE_IMAGE_LENGTH = 3_000_000;

/**
 * Request contract to submit identity for verification. First name, last name and
 * date of birth are compared against the provider record. Nigeria (QoreID) also
 * sends `documentType`, `idNumber` and a live `faceImage`; the United States
 * (Stripe Identity) collects the document and selfie through the provider SDK, so
 * those are omitted and the response returns a `clientSecret`. The document
 * number, date of birth and selfie are sensitive and are excluded from logs.
 */
export class SubmitKycRequestDto {
  @ApiProperty({ example: 'Ada', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Obi', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: '1990-04-20', description: 'Date of birth as an ISO calendar date' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiPropertyOptional({
    enum: KycDocumentType,
    enumName: 'KycDocumentType',
    description: 'Required for Nigeria (QoreID); omitted for the US',
  })
  @IsOptional()
  @IsIn(Object.values(KycDocumentType))
  documentType?: string;

  @ApiPropertyOptional({
    example: '12345678901',
    description: 'NIN, licence or passport (Nigeria)',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(40)
  idNumber?: string;

  @ApiPropertyOptional({ description: 'Live selfie as base64 (Nigeria); never stored' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_FACE_IMAGE_LENGTH)
  faceImage?: string;
}
