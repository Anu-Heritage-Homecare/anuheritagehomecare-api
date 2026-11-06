import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { DocumentUploadTicket } from '@shared/application/ports/document-storage.port';
import {
  AccountDocumentResult,
  AccountDocumentsResult,
} from '../../application/dto/account-documents.result';

/** Signed ticket for a direct document upload to object storage. */
export class AccountDocumentUploadTicketResponseDto implements DocumentUploadTicket {
  @ApiProperty({ description: 'Where the client POSTs the multipart form' })
  uploadUrl!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Form fields to send with the file (signature, api key, timestamp, public id)',
  })
  fields!: Record<string, string>;

  @ApiProperty({ description: 'The key to register once the upload succeeds' })
  key!: string;

  static fromTicket(ticket: DocumentUploadTicket): AccountDocumentUploadTicketResponseDto {
    const dto = new AccountDocumentUploadTicketResponseDto();
    dto.uploadUrl = ticket.uploadUrl;
    dto.fields = ticket.fields;
    dto.key = ticket.key;
    return dto;
  }
}

/** Register a document after it has been uploaded to object storage. */
export class RegisterAccountDocumentRequestDto {
  @ApiProperty({ example: 'ID Verification' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'CP_ID_Adeyemi_Funmilayo.pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  fileName!: string;

  @ApiProperty({ description: 'The storage key returned by the upload ticket' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty({ example: 4_404_019, description: 'File size in bytes' })
  @IsInt()
  @IsPositive()
  sizeBytes!: number;
}

class AccountDocumentDto implements AccountDocumentResult {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() uploadedAt!: string;
  @ApiProperty({ description: 'Signed URL to view or download; empty if storage is off' })
  downloadUrl!: string;
}

export class AccountDocumentsResponseDto implements AccountDocumentsResult {
  @ApiProperty({ type: [AccountDocumentDto] }) documents!: AccountDocumentDto[];
  @ApiProperty() total!: number;

  static fromResult(result: AccountDocumentsResult): AccountDocumentsResponseDto {
    return result;
  }
}
