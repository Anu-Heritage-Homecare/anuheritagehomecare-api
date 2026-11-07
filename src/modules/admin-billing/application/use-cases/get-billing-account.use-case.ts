import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  BillingAccountDetailResult,
  BillingAccountEventResult,
  BillingAccountInvoiceResult,
  formatAccountReference,
} from '../dto/billing-account-detail.result';
import {
  BILLING_ACCOUNTS_READ_MODEL,
  BillingAccountDetailView,
  BillingAccountEventView,
  BillingAccountInvoiceView,
  BillingAccountsReadModel,
} from '../ports/billing-accounts-read.port';

const EVENT_TITLES: Record<BillingAccountEventView['type'], string> = {
  PAYMENT_RECORDED: 'Payment Recorded',
  INVOICE_ISSUED: 'Invoice Issued',
  CARE_RECIPIENT_LINKED: 'New Care Recipient Linked',
  CARE_PLAN_UPDATED: 'Care Plan Updated',
  ACCOUNT_DETAILS_EDITED: 'Account Details Edited',
  REMINDER_SENT: 'Reminder Sent',
};

/** Assemble the Billing Account detail (Overview tab). Read only. */
@Injectable()
export class GetBillingAccountUseCase {
  constructor(
    @Inject(BILLING_ACCOUNTS_READ_MODEL) private readonly reads: BillingAccountsReadModel,
  ) {}

  async execute(id: string): Promise<BillingAccountDetailResult> {
    const view = await this.reads.detail(id);
    if (view === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    return toResult(view);
  }
}

function toResult(view: BillingAccountDetailView): BillingAccountDetailResult {
  return {
    id: view.id,
    accountName: view.accountName,
    primaryContact: view.primaryContact,
    email: view.email,
    phone: view.phone,
    status: view.status,
    summary: {
      reference: formatAccountReference(view.createdAt, view.sequence),
      createdDate: view.createdAt.toISOString(),
      branch: view.branch,
      paymentTerms: view.paymentTermsDays === null ? null : `Net ${view.paymentTermsDays}`,
      preferredMethod: view.preferredPaymentMethod,
    },
    financial: {
      currency: view.currency,
      outstandingMinor: view.outstandingMinor,
      totalBilledMinor: view.totalBilledMinor,
      totalPaidMinor: view.totalPaidMinor,
      lastPaymentAt: view.lastPaymentAt === null ? null : view.lastPaymentAt.toISOString(),
    },
    recentInvoices: view.recentInvoices.map(toInvoice),
    timeline: view.timeline.map(toEvent),
  };
}

function toInvoice(invoice: BillingAccountInvoiceView): BillingAccountInvoiceResult {
  return {
    number: invoiceNumber(invoice.issuedAt, invoice.sequence),
    amountMinor: invoice.amountMinor,
    dueDate: invoice.dueDate === null ? null : invoice.dueDate.toISOString(),
    status: invoice.status,
  };
}

function toEvent(event: BillingAccountEventView): BillingAccountEventResult {
  return {
    type: event.type,
    title: EVENT_TITLES[event.type],
    at: event.at.toISOString(),
    amountMinor: event.amountMinor,
    methodLabel: event.methodLabel,
    invoiceNumber:
      event.invoiceSequence === null || event.invoiceIssuedAt === null
        ? null
        : invoiceNumber(event.invoiceIssuedAt, event.invoiceSequence),
    recipientName: event.recipientName,
    detail: event.detail,
    actorName: event.actorName,
  };
}

/** Matches the per recipient Billing view: INV-<year>-<sequence>. */
function invoiceNumber(issuedAt: Date, sequence: number): string {
  return `INV-${issuedAt.getUTCFullYear()}-${String(sequence).padStart(3, '0')}`;
}
