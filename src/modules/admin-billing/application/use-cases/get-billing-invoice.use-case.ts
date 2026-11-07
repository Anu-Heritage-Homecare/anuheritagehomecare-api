import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingSettings } from '../../domain/billing-settings.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import {
  BillingInvoiceDetailResult,
  BillingInvoiceIssuerResult,
} from '../dto/billing-invoice-detail.result';
import { basisPointsToPercent } from '../dto/billing-settings.result';
import {
  BILLING_INVOICES_READ_MODEL,
  BillingInvoiceDetailView,
  BillingInvoicesReadModel,
} from '../ports/billing-invoices-read.port';

const MILLIS_PER_DAY = 86_400_000;

/** Assemble the single invoice detail (Overview tab). Read only. */
@Injectable()
export class GetBillingInvoiceUseCase {
  constructor(
    @Inject(BILLING_INVOICES_READ_MODEL) private readonly reads: BillingInvoicesReadModel,
    @Inject(BILLING_SETTINGS_REPOSITORY) private readonly settings: BillingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<BillingInvoiceDetailResult> {
    const [view, settings] = await Promise.all([
      this.reads.detail(id, this.clock.now()),
      this.settings.load(),
    ]);
    if (view === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    return toResult(view, issuerOf(settings ?? BillingSettings.createDefault()));
  }
}

function issuerOf(settings: BillingSettings): BillingInvoiceIssuerResult {
  const p = settings.snapshot();
  return {
    companyName: p.companyName,
    companyAddress: p.companyAddress,
    bankName: p.bankName,
    bankAccountNumber: p.bankAccountNumber,
    bankAccountName: p.bankAccountName,
  };
}

function toResult(
  view: BillingInvoiceDetailView,
  issuer: BillingInvoiceIssuerResult,
): BillingInvoiceDetailResult {
  const balanceDueMinor = Math.max(0, view.totalAmountMinor - view.amountPaidMinor);
  const percentPaid =
    view.totalAmountMinor === 0
      ? 0
      : Math.round((view.amountPaidMinor / view.totalAmountMinor) * 100);
  return {
    id: view.id,
    number: `INV-${view.issuedAt.getUTCFullYear()}-${String(view.sequence).padStart(3, '0')}`,
    status: view.status,
    billingAccountId: view.billingAccountId,
    billingAccountName: view.billingAccountName,
    billingAddress: view.billingAddress,
    careRecipientName: view.careRecipientName,
    careRecipientPhotoKey: view.careRecipientPhotoKey,
    invoiceDate: view.issuedAt.toISOString(),
    dueDate: view.dueDate === null ? null : view.dueDate.toISOString(),
    paymentTerms: paymentTerms(view.issuedAt, view.dueDate),
    servicePeriodStart: view.periodStart.toISOString(),
    servicePeriodEnd: view.periodEnd.toISOString(),
    currency: view.currency,
    subtotalMinor: view.subtotalMinor,
    discountTotalMinor: view.discountTotalMinor,
    taxMinor: view.taxMinor,
    taxRatePercent: basisPointsToPercent(view.taxRateBasisPoints),
    totalAmountMinor: view.totalAmountMinor,
    insuranceCoveredMinor: view.insuranceCoveredMinor,
    amountPaidMinor: view.amountPaidMinor,
    balanceDueMinor,
    percentPaid,
    lineItems: view.lineItems.map((line) => ({
      serviceName: line.serviceName,
      quantity: line.quantity,
      unit: line.unit,
      rateMinor: line.rateMinor,
      amountMinor: line.amountMinor,
    })),
    issuer,
  };
}

/** Net terms derived from the days between the invoice date and the due date. */
function paymentTerms(issuedAt: Date, dueDate: Date | null): string | null {
  if (dueDate === null) {
    return null;
  }
  const days = Math.round((dueDate.getTime() - issuedAt.getTime()) / MILLIS_PER_DAY);
  return `Net ${days}`;
}
