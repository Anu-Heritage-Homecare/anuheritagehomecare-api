import { Module } from '@nestjs/common';
import { BILLING_PROFILE_REPOSITORY } from './domain/billing-profile.repository';
import { INVOICE_PAYMENT_REPOSITORY } from './domain/invoice-payment.repository';
import { INVOICE_REPOSITORY } from './domain/invoice.repository';
import { BillingProfilePrismaRepository } from './infrastructure/persistence/billing-profile-prisma.repository';
import { InvoicePaymentPrismaRepository } from './infrastructure/persistence/invoice-payment-prisma.repository';
import { InvoicePrismaRepository } from './infrastructure/persistence/invoice-prisma.repository';

/**
 * Recipient billing bounded context composition root. Owns the invoice, payment and
 * billing profile write side; the admin billing read model composes these tables.
 * The domain ports are bound to their Prisma adapters here and exported so the admin
 * layer depends only on the abstractions.
 */
@Module({
  providers: [
    { provide: INVOICE_REPOSITORY, useClass: InvoicePrismaRepository },
    { provide: INVOICE_PAYMENT_REPOSITORY, useClass: InvoicePaymentPrismaRepository },
    { provide: BILLING_PROFILE_REPOSITORY, useClass: BillingProfilePrismaRepository },
  ],
  exports: [INVOICE_REPOSITORY, INVOICE_PAYMENT_REPOSITORY, BILLING_PROFILE_REPOSITORY],
})
export class RecipientBillingModule {}
