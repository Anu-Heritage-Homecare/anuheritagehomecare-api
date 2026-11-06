import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { Payment } from '@modules/payments/domain/payment.entity';
import { PayableType } from '@modules/payments/domain/payable-type.enum';
import { providerForCurrency } from '@modules/payments/domain/payment-provider.enum';
import { PAYMENT_REPOSITORY, PaymentRepository } from '@modules/payments/domain/payment.repository';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '@modules/payments/application/ports/payment-gateway.port';
import {
  INVOICE_PAYMENT_WRITE_REPOSITORY,
  InvoicePaymentWriteRepository,
} from '../../domain/invoice-payment-write.repository';

export interface RequestInvoiceOnlinePaymentResult {
  paymentId: string;
  provider: string;
  currency: string;
  amountMinor: number;
  /** Stripe: the PaymentIntent client secret the payer confirms with. */
  clientSecret: string | null;
  /** Paystack: the hosted checkout URL to send the payer to. */
  authorizationUrl: string | null;
}

/**
 * Request an online payment for an invoice: ask the gateway (chosen by the invoice
 * currency) to start a charge for the outstanding balance and return the hosted
 * link or client secret the office shares with the payer. A pending Payment is
 * recorded so the existing provider webhook reconciles it (recording the invoice
 * payment and settling the invoice) on success.
 */
@Injectable()
export class RequestInvoiceOnlinePaymentUseCase {
  constructor(
    @Inject(INVOICE_PAYMENT_WRITE_REPOSITORY)
    private readonly invoices: InvoicePaymentWriteRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: { invoiceId: string }): Promise<RequestInvoiceOnlinePaymentResult> {
    const payable = await this.invoices.loadPayable(command.invoiceId);
    if (payable === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    if (payable.alreadyPaid || payable.balanceMinor <= 0) {
      throw new ValidationException('This invoice has no outstanding balance');
    }

    const amount = Money.fromMinor(payable.balanceMinor, payable.currency);
    const provider = providerForCurrency(payable.currency);
    const paymentId = this.ids.generate();
    const initialization = await this.gateway.initialize({
      provider,
      amount,
      reference: paymentId,
      ownerEmail: payable.ownerEmail,
      metadata: {
        paymentId,
        ownerId: payable.ownerId,
        payableType: PayableType.Invoice,
        payableId: command.invoiceId,
      },
    });

    const payment = Payment.initiate({
      id: paymentId,
      ownerId: payable.ownerId,
      payableType: PayableType.Invoice,
      payableId: command.invoiceId,
      provider,
      providerReference: initialization.providerReference,
      amount,
      now: this.clock.now(),
    });
    await this.payments.save(payment);

    return {
      paymentId,
      provider,
      currency: payable.currency,
      amountMinor: amount.amountMinor,
      clientSecret: initialization.clientSecret ?? null,
      authorizationUrl: initialization.authorizationUrl ?? null,
    };
  }
}
