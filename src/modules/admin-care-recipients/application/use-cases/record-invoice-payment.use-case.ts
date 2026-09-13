import { Inject, Injectable } from '@nestjs/common';
import { InvoicePayment } from '@modules/recipient-billing/domain/invoice-payment.entity';
import {
  INVOICE_PAYMENT_REPOSITORY,
  InvoicePaymentRepository,
} from '@modules/recipient-billing/domain/invoice-payment.repository';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '@modules/recipient-billing/domain/invoice.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface RecordInvoicePaymentCommand {
  recipientId: string;
  invoiceId: string;
  amountMinor: number;
  methodLabel?: string | null;
  receivedAt?: Date | null;
}

/**
 * Use case: the admin records a payment received towards an invoice. The payment
 * currency matches the invoice; when the payment covers the patient due the invoice
 * is marked paid.
 */
@Injectable()
export class RecordInvoicePaymentUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(INVOICE_PAYMENT_REPOSITORY) private readonly payments: InvoicePaymentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: RecordInvoicePaymentCommand): Promise<{ id: string }> {
    const invoice = await this.invoices.findById(command.invoiceId);
    if (invoice === null || invoice.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Invoice not found');
    }

    const now = this.clock.now();
    const payment = InvoicePayment.record({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      invoiceId: invoice.id,
      amountMinor: command.amountMinor,
      currency: invoice.currency,
      methodLabel: command.methodLabel,
      receivedAt: command.receivedAt ?? now,
      now,
    });
    await this.payments.add(payment);

    if (command.amountMinor >= invoice.patientDueMinor) {
      invoice.markPaid();
      await this.invoices.save(invoice);
    }
    return { id: payment.id };
  }
}
