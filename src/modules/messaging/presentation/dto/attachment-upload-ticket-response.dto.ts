import { ApiProperty } from '@nestjs/swagger';
import { PhotoUploadTicket } from '@shared/application/ports/photo-storage.port';

/** A signed ticket the back office uses to upload a message attachment to the store. */
export class AttachmentUploadTicketResponseDto {
  @ApiProperty({ description: 'Where the client POSTs the multipart upload' })
  uploadUrl!: string;

  @ApiProperty({
    description: 'Form fields to send alongside the file',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fields!: Record<string, string>;

  @ApiProperty({ description: 'The storage key to send on the message once uploaded' })
  key!: string;

  static fromTicket(ticket: PhotoUploadTicket): AttachmentUploadTicketResponseDto {
    return Object.assign(new AttachmentUploadTicketResponseDto(), ticket);
  }
}
