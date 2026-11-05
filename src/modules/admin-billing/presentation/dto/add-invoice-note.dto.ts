import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import {
  ALL_INVOICE_NOTE_CATEGORIES,
  InvoiceNoteCategory,
} from '../../domain/invoice-note-category.enum';
import { InvoiceNoteCreatedResult } from '../../application/dto/billing-invoice-notes.result';

/** Add an internal note to an invoice. */
export class AddInvoiceNoteRequestDto {
  @ApiProperty({ enum: ALL_INVOICE_NOTE_CATEGORIES, default: InvoiceNoteCategory.General })
  @IsEnum(InvoiceNoteCategory)
  category!: InvoiceNoteCategory;

  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

export class InvoiceNoteCreatedDto implements InvoiceNoteCreatedResult {
  @ApiProperty() id!: string;
  @ApiProperty() createdAt!: string;
}
