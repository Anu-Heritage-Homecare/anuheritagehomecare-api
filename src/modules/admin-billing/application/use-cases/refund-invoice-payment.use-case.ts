import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  INVOICE_PAYMENT_WRITE_REPOSITORY,
  InvoicePaymentWriteRepository,
} from '../../domain/invoice-payment-write.repository';

export interface RefundInvoicePaymentCommand {
  paymentId: string;
  reason: string | null;
  adminId: string;
}

/**
 * Refund a recorded payment from the back office: stamp it refunded and reopen the
 * invoice it settled, so the invoice balance recomputes from the remaining payments.
 *
 * shortcut: records the refund only; it does not call the provider to return the money
 * (the recorded payment holds no provider reference). Wire the gateway refund here when
 * the provider reference is tracked on the settling charge.
 */
@Injectable()
export class RefundInvoicePaymentUseCase {
  constructor(
    @Inject(INVOICE_PAYMENT_WRITE_REPOSITORY)
    private readonly payments: InvoicePaymentWriteRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RefundInvoicePaymentCommand): Promise<void> {
    const payment = await this.payments.loadRecordedPayment(command.paymentId);
    if (payment === null) {
      throw new NotFoundDomainException('Payment not found');
    }
    if (payment.alreadyRefunded) {
      throw new ValidationException('This payment has already been refunded');
    }
    await this.payments.refund({
      paymentId: command.paymentId,
      reason: command.reason,
      adminId: command.adminId,
      now: this.clock.now(),
    });
  }
}
