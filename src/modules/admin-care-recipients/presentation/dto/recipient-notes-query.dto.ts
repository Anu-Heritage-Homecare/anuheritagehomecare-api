import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ALL_NOTE_CATEGORIES, NoteCategory } from '@modules/care-notes/domain/note-category.enum';

export class RecipientNotesQueryDto {
  @ApiPropertyOptional({ enum: ALL_NOTE_CATEGORIES, description: 'Filter by category tab' })
  @IsOptional()
  @IsIn(ALL_NOTE_CATEGORIES)
  category?: NoteCategory;

  @ApiPropertyOptional({ description: 'Search the note content or author' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by an exact author name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
