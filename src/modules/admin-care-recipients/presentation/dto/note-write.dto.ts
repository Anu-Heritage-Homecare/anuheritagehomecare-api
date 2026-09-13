import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_NOTE_CATEGORIES, NoteCategory } from '@modules/care-notes/domain/note-category.enum';

export class CreateNoteRequestDto {
  @ApiProperty({ enum: ALL_NOTE_CATEGORIES })
  @IsIn(ALL_NOTE_CATEGORIES)
  category!: NoteCategory;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(4000) content!: string;

  @ApiProperty({ description: 'The displayed author name (for example the coordinator)' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  authorName!: string;

  @ApiPropertyOptional({ description: 'The author role, for example "Care Coordinator"' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorRole?: string;

  @ApiPropertyOptional({ type: [String], description: 'Opaque attachment storage keys' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  attachmentKeys?: string[];

  @ApiPropertyOptional({ description: 'Flag the note for urgent supervisor attention' })
  @IsOptional()
  @IsBoolean()
  flaggedForReview?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'When the note was logged',
  })
  @IsOptional()
  @IsISO8601()
  postedAt?: string;
}

export class FlagNoteRequestDto {
  @ApiProperty({ description: 'Whether the note is flagged for review' })
  @IsBoolean()
  flagged!: boolean;
}

export class AddNoteCommentRequestDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) authorName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) authorRole?: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) content!: string;
}
