import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  INVOICE_PAYMENT_WRITE_REPOSITORY,
  InvoicePaymentWriteRepository,
} from '../../domain/invoice-payment-write.repository';

export interface RecordInvoicePaymentCommand {
  invoiceId: string;
  amountMinor: number;
  methodLabel: string | null;
  /** When the payment was received; defaults to now. */
  receivedAt: Date | null;
}

export interface RecordInvoicePaymentResult {
  id: string;
  /** The invoice status after the payment: PAID once the balance reaches zero. */
  invoicePaid: boolean;
}

/**
 * Record an offline payment (a bank transfer or cheque) against an invoice from the
 * back office, and settle the invoice once its balance reaches zero. The amount is
 * entered by the office; the currency is read from the invoice.
 */
@Injectable()
export class RecordInvoicePaymentUseCase {
  constructor(
    @Inject(INVOICE_PAYMENT_WRITE_REPOSITORY)
    private readonly payments: InvoicePaymentWriteRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: RecordInvoicePaymentCommand): Promise<RecordInvoicePaymentResult> {
    if (!Number.isInteger(command.amountMinor) || command.amountMinor <= 0) {
      throw new ValidationException('The payment amount must be a positive whole number');
    }

    const context = await this.payments.loadForPayment(command.invoiceId);
    if (context === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    if (context.alreadyPaid) {
      throw new ValidationException('This invoice is already paid');
    }

    const id = this.ids.generate();
    await this.payments.record({
      id,
      invoiceId: command.invoiceId,
      careRecipientId: context.careRecipientId,
      amountMinor: command.amountMinor,
      currency: context.currency,
      methodLabel: command.methodLabel,
      receivedAt: command.receivedAt ?? this.clock.now(),
    });

    const invoicePaid = context.paidMinor + command.amountMinor >= context.patientDueMinor;
    if (invoicePaid) {
      await this.payments.markPaid(command.invoiceId);
    }

    return { id, invoicePaid };
  }
}
