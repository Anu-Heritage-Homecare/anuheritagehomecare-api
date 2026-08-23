import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

const MAX_NOTE_LENGTH = 4000;
const MAX_PHOTOS = 20;
const MAX_PHOTO_KEY_LENGTH = 500;

/**
 * The visit and family notes plus attached photo keys. Free text about the
 * recipient, so it is sensitive and excluded from logs. Photo keys are opaque
 * storage references (the upload endpoint is deferred).
 */
export class SaveVisitNotesRequestDto {
  @ApiPropertyOptional({ nullable: true, example: 'Patient in good spirits, ate well.' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  visitNote?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Please restock the pantry.' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  familyNote?: string | null;

  @ApiPropertyOptional({ isArray: true, type: String, example: ['visits/abc/photo-1.jpg'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PHOTOS)
  @IsString({ each: true })
  @MaxLength(MAX_PHOTO_KEY_LENGTH, { each: true })
  photoKeys?: string[];
}
