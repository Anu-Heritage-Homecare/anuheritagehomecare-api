import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FamilyDirectoryModule } from '@modules/family-directory/family-directory.module';
import { BILLING_ACCOUNTS_READ_MODEL } from './application/ports/billing-accounts-read.port';
import { BILLING_DASHBOARD_READ_MODEL } from './application/ports/billing-dashboard-read.port';
import { CreateBillingAccountUseCase } from './application/use-cases/create-billing-account.use-case';
import { GetBillingDashboardUseCase } from './application/use-cases/get-billing-dashboard.use-case';
import { ListBillingAccountsUseCase } from './application/use-cases/list-billing-accounts.use-case';
import { BillingAccountsReadPrisma } from './infrastructure/persistence/billing-accounts-read.prisma';
import { BillingDashboardReadPrisma } from './infrastructure/persistence/billing-dashboard-read.prisma';
import { AdminBillingController } from './presentation/admin-billing.controller';

/**
 * Admin Billing control panel. A read aggregator over the recipient invoicing tables
 * (invoices and recorded payments) scoped to one market currency, plus the Billing
 * Accounts directory over the family directory. Separate admin auth at the controller.
 */
@Module({
  imports: [PassportModule, FamilyDirectoryModule],
  controllers: [AdminBillingController],
  providers: [
    GetBillingDashboardUseCase,
    ListBillingAccountsUseCase,
    CreateBillingAccountUseCase,
    { provide: BILLING_DASHBOARD_READ_MODEL, useClass: BillingDashboardReadPrisma },
    { provide: BILLING_ACCOUNTS_READ_MODEL, useClass: BillingAccountsReadPrisma },
  ],
})
export class AdminBillingModule {}
