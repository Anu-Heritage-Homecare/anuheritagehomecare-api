import { ApiProperty } from '@nestjs/swagger';
import { PhotoUploadTicket } from '@shared/application/ports/photo-storage.port';

/**
 * A signed ticket the app uses to upload a care recipient's profile photo straight
 * to the object store. Persist the returned `key` as `photoKey` on the care
 * recipient draft once the upload succeeds.
 */
export class CareRecipientPhotoTicketResponseDto {
  @ApiProperty({ description: 'Where the client POSTs the multipart upload' })
  uploadUrl!: string;

  @ApiProperty({
    description: 'Form fields to send alongside the file',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fields!: Record<string, string>;

  @ApiProperty({ description: 'The key to persist as photoKey on the care recipient' })
  key!: string;

  static fromTicket(ticket: PhotoUploadTicket): CareRecipientPhotoTicketResponseDto {
    return Object.assign(new CareRecipientPhotoTicketResponseDto(), ticket);
  }
}
