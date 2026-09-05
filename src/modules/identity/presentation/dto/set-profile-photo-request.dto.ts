import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request to persist the profile photo after the client has uploaded the image
 * to the object store. Carries only the opaque key, never the image bytes; omit
 * or send null to clear the photo.
 */
export class SetProfilePhotoRequestDto {
  @ApiProperty({
    nullable: true,
    description: 'The object store key from a completed upload, or null to clear the photo',
    example: 'avatars/1a2b/photo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoKey?: string | null;
}
