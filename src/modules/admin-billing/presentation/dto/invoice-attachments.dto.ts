import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { DocumentUploadTicket } from '@shared/application/ports/document-storage.port';
import {
  InvoiceAttachmentResult,
  InvoiceAttachmentsResult,
} from '../../application/dto/invoice-attachments.result';

/** Signed ticket for a direct attachment upload to object storage. */
export class InvoiceAttachmentUploadTicketResponseDto implements DocumentUploadTicket {
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

  static fromTicket(ticket: DocumentUploadTicket): InvoiceAttachmentUploadTicketResponseDto {
    const dto = new InvoiceAttachmentUploadTicketResponseDto();
    dto.uploadUrl = ticket.uploadUrl;
    dto.fields = ticket.fields;
    dto.key = ticket.key;
    return dto;
  }
}

/** Register an attachment after it has been uploaded to object storage. */
export class RegisterInvoiceAttachmentRequestDto {
  @ApiProperty({ example: 'Signed Agreement' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'INV-2026-0451-agreement.pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  fileName!: string;

  @ApiProperty({ description: 'The storage key returned by the upload ticket' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty({ example: 180_244, description: 'File size in bytes' })
  @IsInt()
  @IsPositive()
  sizeBytes!: number;
}

class InvoiceAttachmentDto implements InvoiceAttachmentResult {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() uploadedAt!: string;
  @ApiProperty({ description: 'Signed URL to view or download; empty if storage is off' })
  downloadUrl!: string;
}

export class InvoiceAttachmentsResponseDto implements InvoiceAttachmentsResult {
  @ApiProperty({ type: [InvoiceAttachmentDto] }) attachments!: InvoiceAttachmentDto[];
  @ApiProperty() total!: number;

  static fromResult(result: InvoiceAttachmentsResult): InvoiceAttachmentsResponseDto {
    return result;
  }
}
