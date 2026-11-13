import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { INVOICE_EVENT_RECORDER, InvoiceEventRecorder } from '../../domain/invoice-event.recorder';
import {
  INVOICE_WRITEOFF_REPOSITORY,
  InvoiceWriteOffRepository,
} from '../../domain/invoice-writeoff.repository';

export interface WriteOffInvoiceCommand {
  invoiceId: string;
  reason: string;
  /** Mandatory ledger justification (the Approval Notes field). */
  justification: string;
  adminId: string;
}

export interface WriteOffInvoiceResult {
  id: string;
  status: 'WRITTEN_OFF';
}

/**
 * Write off (as uncollectable bad debt) an outstanding invoice (the Confirm Write-off modal).
 * Permanently closes the receivable: the full outstanding balance is written off, the invoice
 * leaves the receivables and collected revenue reads, and the reason plus the mandatory
 * approval justification are appended to the lifecycle audit log. Only a PENDING invoice can
 * be written off; a paid, cancelled or already written off invoice is rejected.
 */
@Injectable()
export class WriteOffInvoiceUseCase {
  constructor(
    @Inject(INVOICE_WRITEOFF_REPOSITORY)
    private readonly invoices: InvoiceWriteOffRepository,
    @Inject(INVOICE_EVENT_RECORDER) private readonly events: InvoiceEventRecorder,
  ) {}

  async execute(command: WriteOffInvoiceCommand): Promise<WriteOffInvoiceResult> {
    const justification = command.justification.trim();
    if (justification.length === 0) {
      throw new ValidationException('A write-off justification is required');
    }
    const outcome = await this.invoices.writeOffIfOutstanding(command.invoiceId);
    if (outcome === 'NOT_FOUND') {
      throw new NotFoundDomainException('Invoice not found');
    }
    if (outcome === 'NOT_OUTSTANDING') {
      throw new ValidationException('Only an outstanding invoice can be written off');
    }
    await this.events.record({
      invoiceId: command.invoiceId,
      type: 'WRITTEN_OFF',
      detail: `${command.reason}: ${justification}`.slice(0, 500),
      actorType: 'ADMIN',
      actorAdminId: command.adminId,
    });
    return { id: command.invoiceId, status: 'WRITTEN_OFF' };
  }
}
