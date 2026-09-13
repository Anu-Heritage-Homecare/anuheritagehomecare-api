import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { User } from '@modules/identity/domain/user.entity';
import { BillingProfile } from '@modules/recipient-billing/domain/billing-profile.entity';
import {
  BILLING_PROFILE_REPOSITORY,
  BillingProfileRepository,
} from '@modules/recipient-billing/domain/billing-profile.repository';
import { InvoiceStatus } from '@modules/recipient-billing/domain/invoice-status.enum';
import { Currency, currencyForCountryCode } from '@shared/domain/currency.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  BillingSummaryView,
  InvoiceRowView,
  PaymentRowView,
  RECIPIENT_BILLING_READ_MODEL,
  RecipientBillingReadModel,
  ServiceBreakdownRowView,
} from '../ports/recipient-billing-read.port';
import {
  BillingProfileResult,
  BillingSummaryResult,
  InvoiceItemResult,
  MoneyResult,
  RecipientBillingResult,
  ServiceBreakdownResult,
} from '../dto/recipient-billing.result';

const INVOICE_PAGE_SIZE = 6;
const PAYMENT_HISTORY_LIMIT = 5;
const DISPLAY_OVERDUE = 'OVERDUE';

/**
 * Use case: assemble one recipient's Billing tab. Composes the summary cards, the
 * office set billing and insurance profile (falling back to the family owner for
 * the billing contact), the paginated invoice list, the year to date service
 * breakdown and the payment history. Money is in the recipient's billing currency,
 * derived server side from the owner's country.
 */
@Injectable()
export class GetRecipientBillingUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_BILLING_READ_MODEL) private readonly readModel: RecipientBillingReadModel,
    @Inject(BILLING_PROFILE_REPOSITORY) private readonly profiles: BillingProfileRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(recipientId: string, page: number): Promise<RecipientBillingResult> {
    const recipient = await this.recipients.findById(recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    const [invoices, summary, breakdown, payments, profile, owner] = await Promise.all([
      this.readModel.listInvoices(recipientId, page, INVOICE_PAGE_SIZE),
      this.readModel.summary(recipientId, monthStart, lastMonthStart, now),
      this.readModel.serviceBreakdown(recipientId, yearStart),
      this.readModel.paymentHistory(recipientId, PAYMENT_HISTORY_LIMIT),
      this.profiles.findByRecipient(recipientId),
      this.users.findById(recipient.ownerId),
    ]);

    const currency = summary.currency ?? this.ownerCurrency(owner);
    const totalPages = INVOICE_PAGE_SIZE > 0 ? Math.ceil(invoices.total / INVOICE_PAGE_SIZE) : 0;

    return {
      summary: this.buildSummary(summary, currency),
      profile: this.buildProfile(profile, owner),
      invoices: {
        items: invoices.rows.map((row) => this.toInvoice(row, now)),
        page,
        pageSize: INVOICE_PAGE_SIZE,
        total: invoices.total,
        totalPages,
      },
      serviceBreakdown: this.buildBreakdown(breakdown, currency),
      paymentHistory: payments.map((p) => this.toPayment(p)),
    };
  }

  private buildSummary(view: BillingSummaryView, currency: Currency | null): BillingSummaryResult {
    const trend =
      view.billedLastMonthMinor === 0
        ? null
        : round1(
            ((view.billedThisMonthMinor - view.billedLastMonthMinor) / view.billedLastMonthMinor) *
              100,
          );
    return {
      totalBilledThisMonth: money(view.billedThisMonthMinor, currency),
      billedTrendPercent: trend,
      outstanding: money(view.outstandingMinor, currency),
      outstandingDueDate: view.earliestDueDate,
      lastPayment: view.lastPaymentMinor === null ? null : money(view.lastPaymentMinor, currency),
      lastPaymentAt: view.lastPaymentAt,
      paymentStatus: view.overdueCount > 0 ? DISPLAY_OVERDUE : 'GOOD',
    };
  }

  private buildProfile(profile: BillingProfile | null, owner: User | null): BillingProfileResult {
    return {
      contact: {
        name: profile?.billingContactName ?? owner?.name.fullName ?? null,
        relationship: profile?.billingContactRelationship ?? owner?.relationshipToRecipient ?? null,
        email: profile?.billingContactEmail ?? owner?.email.value ?? null,
        phone: profile?.billingContactPhone ?? owner?.phone.value ?? null,
      },
      paymentMethod: {
        brand: profile?.paymentMethodBrand ?? null,
        last4: profile?.paymentMethodLast4 ?? null,
        autoPayEnabled: profile?.autoPayEnabled ?? false,
      },
      insurance: {
        provider: profile?.primaryInsuranceProvider ?? null,
        policyNumber: profile?.primaryInsurancePolicyNumber ?? null,
        coveragePercent: profile?.primaryInsuranceCoveragePercent ?? null,
        coverageDetails: profile?.primaryInsuranceCoverageDetails ?? null,
        coPayPerVisit:
          profile?.coPayPerVisitMinor == null || profile.coPayCurrency === null
            ? null
            : money(profile.coPayPerVisitMinor, profile.coPayCurrency),
        secondary: profile?.secondaryInsurance ?? null,
      },
    };
  }

  private toInvoice(row: InvoiceRowView, now: Date): InvoiceItemResult {
    const patientDue = row.amountMinor - row.insuranceCoveredMinor;
    const overdue =
      row.status === InvoiceStatus.Pending &&
      row.dueDate !== null &&
      row.dueDate.getTime() < now.getTime();
    return {
      id: row.id,
      number: `INV-${row.issuedAt.getUTCFullYear()}-${String(row.sequence).padStart(3, '0')}`,
      period: { start: row.periodStart, end: row.periodEnd },
      servicesLabel: row.servicesLabel,
      amount: forceMoney(row.amountMinor, row.currency),
      insuranceCovered: forceMoney(row.insuranceCoveredMinor, row.currency),
      patientDue: forceMoney(patientDue, row.currency),
      displayStatus: overdue ? DISPLAY_OVERDUE : String(row.status),
    };
  }

  private buildBreakdown(
    rows: ServiceBreakdownRowView[],
    currency: Currency | null,
  ): ServiceBreakdownResult {
    const totalMinor = rows.reduce((sum, r) => sum + r.amountMinor, 0);
    return {
      total: money(totalMinor, currency),
      items: rows.map((r) => ({
        serviceName: r.serviceName,
        amount: forceMoney(r.amountMinor, currency ?? Currency.UnitedStatesDollar),
        percent: totalMinor === 0 ? 0 : round1((r.amountMinor / totalMinor) * 100),
      })),
    };
  }

  private toPayment(payment: PaymentRowView): {
    amount: MoneyResult;
    methodLabel: string | null;
    receivedAt: Date;
  } {
    return {
      amount: forceMoney(payment.amountMinor, payment.currency),
      methodLabel: payment.methodLabel,
      receivedAt: payment.receivedAt,
    };
  }

  private ownerCurrency(owner: User | null): Currency | null {
    if (owner === null) {
      return null;
    }
    try {
      return currencyForCountryCode(String(owner.address.country));
    } catch {
      return null;
    }
  }
}

/** A money result, or null when no currency is known. */
function money(amountMinor: number, currency: Currency | null): MoneyResult | null {
  return currency === null ? null : { amountMinor, currency: String(currency) };
}

/** A money result with a definite currency. */
function forceMoney(amountMinor: number, currency: Currency): MoneyResult {
  return { amountMinor, currency: String(currency) };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
