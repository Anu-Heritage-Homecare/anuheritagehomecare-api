import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingInvoiceServicesResult } from '../dto/billing-invoice-services.result';
import {
  BILLING_INVOICES_READ_MODEL,
  BillingInvoicesReadModel,
} from '../ports/billing-invoices-read.port';

/** The Services tab: the invoice's billed service lines with the distinct count. Read only. */
@Injectable()
export class GetBillingInvoiceServicesUseCase {
  constructor(
    @Inject(BILLING_INVOICES_READ_MODEL) private readonly reads: BillingInvoicesReadModel,
  ) {}

  async execute(id: string): Promise<BillingInvoiceServicesResult> {
    const view = await this.reads.services(id);
    if (view === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    const distinct = new Set(view.services.map((service) => service.serviceName));
    return {
      currency: view.currency,
      servicePeriodStart: view.servicePeriodStart.toISOString(),
      servicePeriodEnd: view.servicePeriodEnd.toISOString(),
      services: view.services.map((service) => ({
        serviceName: service.serviceName,
        category: service.category,
        hoursUnits: service.hoursUnits,
        unit: service.unit,
        rateMinor: service.rateMinor,
        amountMinor: service.amountMinor,
        serviceDateStart:
          service.serviceDateStart === null ? null : service.serviceDateStart.toISOString(),
        serviceDateEnd:
          service.serviceDateEnd === null ? null : service.serviceDateEnd.toISOString(),
        assignedCaregiver: service.assignedCaregiver,
      })),
      distinctCount: distinct.size,
      summaryAmountMinor: view.services.reduce((sum, service) => sum + service.amountMinor, 0),
    };
  }
}
