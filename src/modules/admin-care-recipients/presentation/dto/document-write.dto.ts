import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ALL_DOCUMENT_CATEGORIES,
  DocumentCategory,
} from '@modules/care-recipients/domain/document-category.enum';
import {
  ALL_DOCUMENT_STATUSES,
  DocumentStatus,
} from '@modules/care-recipients/domain/document-status.enum';

const MAX_SIZE_BYTES = 5_000_000_000;

export class UploadDocumentRequestDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) name!: string;

  @ApiProperty({ enum: ALL_DOCUMENT_CATEGORIES })
  @IsIn(ALL_DOCUMENT_CATEGORIES)
  category!: DocumentCategory;

  @ApiProperty({ description: 'Opaque object storage key for the uploaded file' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty({ minimum: 0, maximum: MAX_SIZE_BYTES })
  @IsInt()
  @Min(0)
  @Max(MAX_SIZE_BYTES)
  sizeBytes!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) uploadedByName?: string;

  @ApiPropertyOptional({ enum: ALL_DOCUMENT_STATUSES })
  @IsOptional()
  @IsIn(ALL_DOCUMENT_STATUSES)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Optional expiry date (ISO), for documents that lapse' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class SetDocumentStatusRequestDto {
  @ApiProperty({ enum: ALL_DOCUMENT_STATUSES })
  @IsIn(ALL_DOCUMENT_STATUSES)
  status!: DocumentStatus;
}
