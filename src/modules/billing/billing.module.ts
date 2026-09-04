import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import {
  BILLING_PAYMENT_DIRECTORY,
  BILLING_PLAN_DIRECTORY,
  BILLING_SUBSCRIPTION_DIRECTORY,
} from './application/ports/billing-directories.port';
import { GetBillingDashboardUseCase } from './application/use-cases/get-billing-dashboard.use-case';
import { GetInvoiceUseCase } from './application/use-cases/get-invoice.use-case';
import { GetReceiptUseCase } from './application/use-cases/get-receipt.use-case';
import { IssueInvoiceUseCase } from './application/use-cases/issue-invoice.use-case';
import { ListInvoicesUseCase } from './application/use-cases/list-invoices.use-case';
import { ListReceiptsUseCase } from './application/use-cases/list-receipts.use-case';
import { PayInvoiceUseCase } from './application/use-cases/pay-invoice.use-case';
import { UpgradeSubscriptionPlanUseCase } from './application/use-cases/upgrade-subscription-plan.use-case';
import { INVOICE_REPOSITORY } from './domain/invoice.repository';
import { BookingsBillingSubscriptionDirectory } from './infrastructure/access/bookings-billing-subscription-directory';
import { CarePlansBillingPlanDirectory } from './infrastructure/access/care-plans-billing-plan-directory';
import { PaymentsBillingPaymentDirectory } from './infrastructure/access/payments-billing-payment-directory';
import { InvoicePrismaRepository } from './infrastructure/persistence/invoice-prisma.repository';
import { FamilyBillingController } from './presentation/family-billing.controller';

/**
 * Billing bounded context. It owns the Invoice aggregate and composes the
 * bookings, care plans and payments contexts (through their exported repositories)
 * into the family owner billing dashboard, invoices and receipts. The invoice
 * issue use case is the office capture path, exported for the future billing job.
 */
@Module({
  imports: [PassportModule, BookingsModule, CarePlansModule, PaymentsModule],
  controllers: [FamilyBillingController],
  providers: [
    GetBillingDashboardUseCase,
    ListInvoicesUseCase,
    GetInvoiceUseCase,
    ListReceiptsUseCase,
    GetReceiptUseCase,
    PayInvoiceUseCase,
    UpgradeSubscriptionPlanUseCase,
    IssueInvoiceUseCase,
    { provide: INVOICE_REPOSITORY, useClass: InvoicePrismaRepository },
    { provide: BILLING_SUBSCRIPTION_DIRECTORY, useClass: BookingsBillingSubscriptionDirectory },
    { provide: BILLING_PLAN_DIRECTORY, useClass: CarePlansBillingPlanDirectory },
    { provide: BILLING_PAYMENT_DIRECTORY, useClass: PaymentsBillingPaymentDirectory },
  ],
  exports: [IssueInvoiceUseCase],
})
export class BillingModule {}
