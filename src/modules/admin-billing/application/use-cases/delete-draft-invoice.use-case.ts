import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  INVOICE_DELETE_REPOSITORY,
  InvoiceDeleteRepository,
} from '../../domain/invoice-delete.repository';

/**
 * Delete a draft invoice (the Delete Draft Invoice modal). Only an invoice that has
 * never been sent and has no recorded payments can be safely deleted; a sent or paid
 * invoice is kept. The delete is permanent (the draft never reached the client).
 */
@Injectable()
export class DeleteDraftInvoiceUseCase {
  constructor(
    @Inject(INVOICE_DELETE_REPOSITORY)
    private readonly invoices: InvoiceDeleteRepository,
  ) {}

  async execute(command: { invoiceId: string }): Promise<void> {
    const outcome = await this.invoices.deleteIfDraft(command.invoiceId);
    switch (outcome) {
      case 'OK':
        return;
      case 'NOT_FOUND':
        throw new NotFoundDomainException('Invoice not found');
      case 'SENT':
        throw new ValidationException('A sent invoice cannot be deleted');
      case 'HAS_PAYMENTS':
        throw new ValidationException('An invoice with recorded payments cannot be deleted');
      case 'NOT_PENDING':
        throw new ValidationException('Only a draft (unsent, pending) invoice can be deleted');
    }
  }
}
