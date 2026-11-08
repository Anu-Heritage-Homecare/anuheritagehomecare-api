import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  INVOICE_CANCEL_REPOSITORY,
  InvoiceCancelRepository,
} from '../../domain/invoice-cancel.repository';
import { INVOICE_EVENT_RECORDER, InvoiceEventRecorder } from '../../domain/invoice-event.recorder';

export interface CancelInvoiceCommand {
  invoiceId: string;
  reason: string;
  notes: string | null;
  adminId: string;
}

export interface CancelInvoiceResult {
  id: string;
  status: 'CANCELLED';
}

/**
 * Cancel (void) a pending invoice (the Cancel Invoice modal). Voids the outstanding
 * receivable; recorded payments are kept. Only a PENDING invoice can be cancelled, and
 * the cancellation reason and internal notes are appended to the lifecycle audit log.
 */
@Injectable()
export class CancelInvoiceUseCase {
  constructor(
    @Inject(INVOICE_CANCEL_REPOSITORY)
    private readonly invoices: InvoiceCancelRepository,
    @Inject(INVOICE_EVENT_RECORDER) private readonly events: InvoiceEventRecorder,
  ) {}

  async execute(command: CancelInvoiceCommand): Promise<CancelInvoiceResult> {
    const outcome = await this.invoices.cancelIfPending(command.invoiceId);
    if (outcome === 'NOT_FOUND') {
      throw new NotFoundDomainException('Invoice not found');
    }
    if (outcome === 'NOT_PENDING') {
      throw new ValidationException('Only a pending invoice can be cancelled');
    }
    const notes = command.notes?.trim() ?? '';
    const detail = notes.length === 0 ? command.reason : `${command.reason}: ${notes}`;
    await this.events.record({
      invoiceId: command.invoiceId,
      type: 'CANCELLED',
      detail: detail.slice(0, 500),
      actorType: 'ADMIN',
      actorAdminId: command.adminId,
    });
    return { id: command.invoiceId, status: 'CANCELLED' };
  }
}
