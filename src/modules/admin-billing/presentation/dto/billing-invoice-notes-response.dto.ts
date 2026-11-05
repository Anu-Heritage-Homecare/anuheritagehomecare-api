import { ApiProperty } from '@nestjs/swagger';
import {
  ALL_INVOICE_NOTE_CATEGORIES,
  InvoiceNoteCategory,
} from '../../domain/invoice-note-category.enum';
import {
  InvoiceNoteResult,
  InvoiceNotesResult,
} from '../../application/dto/billing-invoice-notes.result';

class InvoiceNoteDto implements InvoiceNoteResult {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ALL_INVOICE_NOTE_CATEGORIES }) category!: InvoiceNoteCategory;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty({ example: 'OPERATIONS_MANAGER' }) authorRole!: string;
  @ApiProperty({ nullable: true, type: String }) authorPhotoKey!: string | null;
}

/** The invoice Notes tab. */
export class BillingInvoiceNotesResponseDto implements InvoiceNotesResult {
  @ApiProperty({ type: [InvoiceNoteDto] }) notes!: InvoiceNoteDto[];
  @ApiProperty() total!: number;

  static fromResult(result: InvoiceNotesResult): BillingInvoiceNotesResponseDto {
    return result;
  }
}
