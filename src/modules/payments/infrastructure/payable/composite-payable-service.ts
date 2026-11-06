import { Injectable } from '@nestjs/common';
import { PayableType } from '../../domain/payable-type.enum';
import { PayableService, PayableSummary } from '../../application/ports/payable-service.port';
import { BookingsPayableService } from './bookings-payable-service';
import { InvoicePayableService } from './invoice-payable-service';

/**
 * Dispatches the PayableService port by payable type: invoices to the invoice
 * adapter, bookings and subscriptions to the bookings adapter.
 */
@Injectable()
export class CompositePayableService implements PayableService {
  constructor(
    private readonly bookings: BookingsPayableService,
    private readonly invoices: InvoicePayableService,
  ) {}

  load(payableType: PayableType, payableId: string): Promise<PayableSummary | null> {
    return this.delegate(payableType).load(payableType, payableId);
  }

  markPaid(payableType: PayableType, payableId: string): Promise<void> {
    return this.delegate(payableType).markPaid(payableType, payableId);
  }

  private delegate(payableType: PayableType): PayableService {
    return payableType === PayableType.Invoice ? this.invoices : this.bookings;
  }
}
