import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  ALL_DOCUMENT_CATEGORIES,
  DocumentCategory,
} from '@modules/care-recipients/domain/document-category.enum';

const SORTS = ['DATE', 'NAME', 'SIZE'] as const;

export class RecipientDocumentsQueryDto {
  @ApiPropertyOptional({ enum: ALL_DOCUMENT_CATEGORIES, description: 'Filter by category tab' })
  @IsOptional()
  @IsIn(ALL_DOCUMENT_CATEGORIES)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Search the document name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: SORTS, default: 'DATE' })
  @IsOptional()
  @IsIn(SORTS)
  sort?: (typeof SORTS)[number];

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  direction?: 'ASC' | 'DESC';

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
