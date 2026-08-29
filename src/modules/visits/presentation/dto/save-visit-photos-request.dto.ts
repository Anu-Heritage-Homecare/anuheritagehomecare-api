import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

const MAX_PHOTOS = 20;
const MAX_PHOTO_KEY_LENGTH = 500;

/**
 * The photo keys attached to a visit. Opaque storage references (the upload
 * endpoint is deferred). The whole set is replaced on each save.
 */
export class SaveVisitPhotosRequestDto {
  @ApiPropertyOptional({ isArray: true, type: String, example: ['visits/abc/photo-1.jpg'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PHOTOS)
  @IsString({ each: true })
  @MaxLength(MAX_PHOTO_KEY_LENGTH, { each: true })
  photoKeys?: string[];
}
