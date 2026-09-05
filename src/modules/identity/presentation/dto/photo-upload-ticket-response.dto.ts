import { ApiProperty } from '@nestjs/swagger';
import { PhotoUploadTicket } from '@shared/application/ports/photo-storage.port';

/** A signed ticket the app uses to upload an avatar straight to the object store. */
export class PhotoUploadTicketResponseDto {
  @ApiProperty({ description: 'Where the client POSTs the multipart upload' })
  uploadUrl!: string;

  @ApiProperty({
    description: 'Form fields to send alongside the file',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fields!: Record<string, string>;

  @ApiProperty({ description: 'The key to persist through the set photo endpoint once uploaded' })
  key!: string;

  static fromTicket(ticket: PhotoUploadTicket): PhotoUploadTicketResponseDto {
    return Object.assign(new PhotoUploadTicketResponseDto(), ticket);
  }
}
