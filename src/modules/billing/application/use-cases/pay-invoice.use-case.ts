import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { PaymentInitiationResult } from '@modules/payments/application/dto/payment.result';
import { InitiatePaymentUseCase } from '@modules/payments/application/use-cases/initiate-payment.use-case';
import { PayableType } from '@modules/payments/domain/payable-type.enum';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceStatus } from '../../domain/invoice-status.enum';
import {
  BILLING_PAYMENT_DIRECTORY,
  BillingPaymentDirectory,
} from '../ports/billing-directories.port';

export interface PayInvoiceCommand {
  ownerId: string;
  ownerEmail: string;
  invoiceId: string;
}

/**
 * Use case: begin paying an invoice. Billing resolves the invoice's amount and
 * currency server side (never the client) and hands them to the payments context
 * as a pre-resolved payable, so payments starts the charge without depending on
 * billing. An invoice already settled by a charge cannot be paid again.
 */
@Injectable()
export class PayInvoiceUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(BILLING_PAYMENT_DIRECTORY) private readonly payments: BillingPaymentDirectory,
    private readonly initiatePayment: InitiatePaymentUseCase,
  ) {}

  async execute(command: PayInvoiceCommand): Promise<PaymentInitiationResult> {
    const invoice = await this.invoices.findById(command.invoiceId);
    if (invoice === null || invoice.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Invoice not found');
    }

    const owed = await this.payments.listForOwner(command.ownerId);
    const alreadyPaid =
      invoice.status === InvoiceStatus.Paid ||
      owed.some(
        (payment) =>
          payment.succeeded &&
          payment.payableType === String(PayableType.Invoice) &&
          payment.payableId === invoice.id,
      );
    if (alreadyPaid) {
      throw new ValidationException('This invoice has already been paid');
    }

    return this.initiatePayment.execute({
      ownerId: command.ownerId,
      ownerEmail: command.ownerEmail,
      payableType: PayableType.Invoice,
      payableId: invoice.id,
      resolvedPayable: {
        ownerId: invoice.ownerId,
        currency: invoice.currency,
        amountMinor: invoice.amountMinor,
        alreadyPaid: false,
        recurring: null,
      },
    });
  }
}
