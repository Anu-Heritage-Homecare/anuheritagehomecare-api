import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  INVOICE_PAYMENT_WRITE_REPOSITORY,
  InvoicePaymentWriteRepository,
} from '../../domain/invoice-payment-write.repository';
import { PAYMENT_EVENT_RECORDER, PaymentEventRecorder } from '../../domain/payment-event.recorder';

export interface RefundInvoicePaymentCommand {
  paymentId: string;
  /** The refund amount in minor units; must not exceed the payment's remaining balance. */
  amountMinor: number;
  method: string | null;
  reason: string | null;
  notes: string | null;
  adminId: string;
}

/**
 * Refund a recorded payment from the back office, in full or in part: record the refund,
 * reduce the payment's net amount and recompute the invoice status from what remains.
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
    @Inject(PAYMENT_EVENT_RECORDER) private readonly events: PaymentEventRecorder,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RefundInvoicePaymentCommand): Promise<void> {
    if (!Number.isInteger(command.amountMinor) || command.amountMinor <= 0) {
      throw new ValidationException('The refund amount must be a positive whole number');
    }
    const payment = await this.payments.loadRecordedPayment(command.paymentId);
    if (payment === null) {
      throw new NotFoundDomainException('Payment not found');
    }
    const remaining = payment.amountMinor - payment.refundedAmountMinor;
    if (remaining <= 0) {
      throw new ValidationException('This payment has already been fully refunded');
    }
    if (command.amountMinor > remaining) {
      throw new ValidationException('The refund amount exceeds the payment balance');
    }

    const now = this.clock.now();
    await this.payments.refund({
      paymentId: command.paymentId,
      amountMinor: command.amountMinor,
      method: command.method,
      reason: command.reason,
      notes: command.notes,
      adminId: command.adminId,
      now,
    });
    await this.events.record([
      {
        paymentId: command.paymentId,
        type: 'REFUNDED',
        at: now,
        actorType: 'ADMIN',
        actorAdminId: command.adminId,
        detail: command.reason,
      },
    ]);
  }
}
