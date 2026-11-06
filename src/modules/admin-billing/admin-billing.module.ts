import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FamilyDirectoryModule } from '@modules/family-directory/family-directory.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { ACCOUNT_ADJUSTMENTS_READ_MODEL } from './application/ports/account-adjustments-read.port';
import { FINANCIAL_REPORTS_READ_MODEL } from './application/ports/financial-reports-read.port';
import { INVOICE_WIZARD_READ_MODEL } from './application/ports/invoice-wizard-read.port';
import { BILLABLE_SERVICES_READ_MODEL } from './application/ports/billable-services-read.port';
import { INVOICE_WRITE_REPOSITORY } from './domain/invoice-write.repository';
import { INVOICE_SEND_REPOSITORY } from './domain/invoice-send.repository';
import { BILLING_ACCOUNTS_READ_MODEL } from './application/ports/billing-accounts-read.port';
import { BILLING_DASHBOARD_READ_MODEL } from './application/ports/billing-dashboard-read.port';
import { BILLING_INVOICE_NOTES_READ_MODEL } from './application/ports/billing-invoice-notes-read.port';
import { BILLING_INVOICES_READ_MODEL } from './application/ports/billing-invoices-read.port';
import { BILLING_PAYMENTS_READ_MODEL } from './application/ports/billing-payments-read.port';
import { AddInvoiceNoteUseCase } from './application/use-cases/add-invoice-note.use-case';
import { ApproveAccountAdjustmentUseCase } from './application/use-cases/approve-account-adjustment.use-case';
import { CreateAccountAdjustmentUseCase } from './application/use-cases/create-account-adjustment.use-case';
import { CreateBillingAccountUseCase } from './application/use-cases/create-billing-account.use-case';
import { SendBillingReminderUseCase } from './application/use-cases/send-billing-reminder.use-case';
import { SetAccountPreferencesUseCase } from './application/use-cases/set-account-preferences.use-case';
import { ListAccountDocumentsUseCase } from './application/use-cases/list-account-documents.use-case';
import { CreateAccountDocumentTicketUseCase } from './application/use-cases/create-account-document-ticket.use-case';
import { RegisterAccountDocumentUseCase } from './application/use-cases/register-account-document.use-case';
import { ACCOUNT_DOCUMENT_REPOSITORY } from './domain/account-document.repository';
import { AccountDocumentPrismaRepository } from './infrastructure/persistence/account-document-prisma.repository';
import { ListInvoiceAttachmentsUseCase } from './application/use-cases/list-invoice-attachments.use-case';
import { CreateInvoiceAttachmentTicketUseCase } from './application/use-cases/create-invoice-attachment-ticket.use-case';
import { RegisterInvoiceAttachmentUseCase } from './application/use-cases/register-invoice-attachment.use-case';
import { INVOICE_ATTACHMENT_REPOSITORY } from './domain/invoice-attachment.repository';
import { InvoiceAttachmentPrismaRepository } from './infrastructure/persistence/invoice-attachment-prisma.repository';
import { RecordInvoicePaymentUseCase } from './application/use-cases/record-invoice-payment.use-case';
import { RequestInvoiceOnlinePaymentUseCase } from './application/use-cases/request-invoice-online-payment.use-case';
import { INVOICE_PAYMENT_WRITE_REPOSITORY } from './domain/invoice-payment-write.repository';
import { InvoicePaymentWritePrismaRepository } from './infrastructure/persistence/invoice-payment-write-prisma.repository';
import { ApproveInvoiceUseCase } from './application/use-cases/approve-invoice.use-case';
import { SendInvoiceReminderUseCase } from './application/use-cases/send-invoice-reminder.use-case';
import { INVOICE_EVENT_RECORDER } from './domain/invoice-event.recorder';
import { InvoiceEventPrismaRecorder } from './infrastructure/persistence/invoice-event-prisma.recorder';
import { DeleteInvoiceAttachmentUseCase } from './application/use-cases/delete-invoice-attachment.use-case';
import { DeleteAccountDocumentUseCase } from './application/use-cases/delete-account-document.use-case';
import { RefundInvoicePaymentUseCase } from './application/use-cases/refund-invoice-payment.use-case';
import { ADMIN_DIRECTORY } from './application/ports/admin-directory.port';
import { PrismaAdminDirectory } from './infrastructure/persistence/prisma-admin-directory';
import { GetBillingAccountActivityUseCase } from './application/use-cases/get-billing-account-activity.use-case';
import { GetBillingAccountUseCase } from './application/use-cases/get-billing-account.use-case';
import { GetBillingDashboardUseCase } from './application/use-cases/get-billing-dashboard.use-case';
import { GetBillingSettingsUseCase } from './application/use-cases/get-billing-settings.use-case';
import { GetFinancialReportUseCase } from './application/use-cases/get-financial-report.use-case';
import { GetInvoiceAccountPreviewUseCase } from './application/use-cases/get-invoice-account-preview.use-case';
import { GetRecipientServicePreviewUseCase } from './application/use-cases/get-recipient-service-preview.use-case';
import { ListBillableServicesUseCase } from './application/use-cases/list-billable-services.use-case';
import { ComputeInvoiceTotalsUseCase } from './application/use-cases/compute-invoice-totals.use-case';
import { CreateInvoiceUseCase } from './application/use-cases/create-invoice.use-case';
import { SendInvoiceUseCase } from './application/use-cases/send-invoice.use-case';
import { UpdateBillingSettingsUseCase } from './application/use-cases/update-billing-settings.use-case';
import { UpdatePaymentMethodUseCase } from './application/use-cases/update-payment-method.use-case';
import { GetBillingInvoiceHistoryUseCase } from './application/use-cases/get-billing-invoice-history.use-case';
import { GetBillingInvoiceServicesUseCase } from './application/use-cases/get-billing-invoice-services.use-case';
import { GetBillingInvoiceUseCase } from './application/use-cases/get-billing-invoice.use-case';
import { ListBillingAccountInvoicesUseCase } from './application/use-cases/list-billing-account-invoices.use-case';
import { ListBillingAccountPaymentsUseCase } from './application/use-cases/list-billing-account-payments.use-case';
import { ListBillingAccountRecipientsUseCase } from './application/use-cases/list-billing-account-recipients.use-case';
import { ListBillingAccountsUseCase } from './application/use-cases/list-billing-accounts.use-case';
import { ListBillingInvoicePaymentsUseCase } from './application/use-cases/list-billing-invoice-payments.use-case';
import { ListBillingInvoicesUseCase } from './application/use-cases/list-billing-invoices.use-case';
import { ListAccountAdjustmentsUseCase } from './application/use-cases/list-account-adjustments.use-case';
import { ReverseAccountAdjustmentUseCase } from './application/use-cases/reverse-account-adjustment.use-case';
import { ListBillingPaymentsUseCase } from './application/use-cases/list-billing-payments.use-case';
import { ListInvoiceNotesUseCase } from './application/use-cases/list-invoice-notes.use-case';
import { ACCOUNT_ADJUSTMENT_REPOSITORY } from './domain/account-adjustment.repository';
import { BILLING_SETTINGS_REPOSITORY } from './domain/billing-settings.repository';
import { INVOICE_NOTE_REPOSITORY } from './domain/invoice-note.repository';
import { AccountAdjustmentPrismaRepository } from './infrastructure/persistence/account-adjustment-prisma.repository';
import { AccountAdjustmentsReadPrisma } from './infrastructure/persistence/account-adjustments-read.prisma';
import { BillingAccountsReadPrisma } from './infrastructure/persistence/billing-accounts-read.prisma';
import { BillingSettingsPrismaRepository } from './infrastructure/persistence/billing-settings-prisma.repository';
import { FinancialReportsReadPrisma } from './infrastructure/persistence/financial-reports-read.prisma';
import { InvoiceWizardReadPrisma } from './infrastructure/persistence/invoice-wizard-read.prisma';
import { BillableServicesReadPrisma } from './infrastructure/persistence/billable-services-read.prisma';
import { InvoiceWritePrismaRepository } from './infrastructure/persistence/invoice-write-prisma.repository';
import { InvoiceSendPrismaRepository } from './infrastructure/persistence/invoice-send-prisma.repository';
import { BillingDashboardReadPrisma } from './infrastructure/persistence/billing-dashboard-read.prisma';
import { BillingInvoiceNotesReadPrisma } from './infrastructure/persistence/billing-invoice-notes-read.prisma';
import { BillingInvoicesReadPrisma } from './infrastructure/persistence/billing-invoices-read.prisma';
import { BillingPaymentsReadPrisma } from './infrastructure/persistence/billing-payments-read.prisma';
import { InvoiceNotePrismaRepository } from './infrastructure/persistence/invoice-note-prisma.repository';
import { AdminBillingController } from './presentation/admin-billing.controller';

/**
 * Admin Billing control panel. A read aggregator over the recipient invoicing tables
 * (invoices and recorded payments) scoped to one market currency, plus the Billing
 * Accounts directory over the family directory. Separate admin auth at the controller.
 */
@Module({
  imports: [PassportModule, FamilyDirectoryModule, PaymentsModule],
  controllers: [AdminBillingController],
  providers: [
    GetBillingDashboardUseCase,
    ListBillingAccountsUseCase,
    GetBillingAccountUseCase,
    ListBillingAccountRecipientsUseCase,
    ListBillingAccountInvoicesUseCase,
    ListBillingAccountPaymentsUseCase,
    GetBillingAccountActivityUseCase,
    ListBillingInvoicesUseCase,
    ListBillingPaymentsUseCase,
    GetBillingInvoiceUseCase,
    GetBillingInvoiceServicesUseCase,
    ListBillingInvoicePaymentsUseCase,
    GetBillingInvoiceHistoryUseCase,
    ListInvoiceNotesUseCase,
    AddInvoiceNoteUseCase,
    CreateBillingAccountUseCase,
    SendBillingReminderUseCase,
    SetAccountPreferencesUseCase,
    ListAccountDocumentsUseCase,
    CreateAccountDocumentTicketUseCase,
    RegisterAccountDocumentUseCase,
    ListInvoiceAttachmentsUseCase,
    CreateInvoiceAttachmentTicketUseCase,
    RegisterInvoiceAttachmentUseCase,
    RecordInvoicePaymentUseCase,
    RequestInvoiceOnlinePaymentUseCase,
    ApproveInvoiceUseCase,
    SendInvoiceReminderUseCase,
    DeleteInvoiceAttachmentUseCase,
    DeleteAccountDocumentUseCase,
    RefundInvoicePaymentUseCase,
    ListAccountAdjustmentsUseCase,
    CreateAccountAdjustmentUseCase,
    ApproveAccountAdjustmentUseCase,
    ReverseAccountAdjustmentUseCase,
    GetFinancialReportUseCase,
    GetBillingSettingsUseCase,
    UpdateBillingSettingsUseCase,
    UpdatePaymentMethodUseCase,
    GetInvoiceAccountPreviewUseCase,
    GetRecipientServicePreviewUseCase,
    ListBillableServicesUseCase,
    ComputeInvoiceTotalsUseCase,
    CreateInvoiceUseCase,
    SendInvoiceUseCase,
    { provide: BILLING_DASHBOARD_READ_MODEL, useClass: BillingDashboardReadPrisma },
    { provide: BILLING_ACCOUNTS_READ_MODEL, useClass: BillingAccountsReadPrisma },
    { provide: BILLING_INVOICES_READ_MODEL, useClass: BillingInvoicesReadPrisma },
    { provide: BILLING_PAYMENTS_READ_MODEL, useClass: BillingPaymentsReadPrisma },
    { provide: BILLING_INVOICE_NOTES_READ_MODEL, useClass: BillingInvoiceNotesReadPrisma },
    { provide: INVOICE_NOTE_REPOSITORY, useClass: InvoiceNotePrismaRepository },
    { provide: ACCOUNT_ADJUSTMENTS_READ_MODEL, useClass: AccountAdjustmentsReadPrisma },
    { provide: ACCOUNT_ADJUSTMENT_REPOSITORY, useClass: AccountAdjustmentPrismaRepository },
    { provide: FINANCIAL_REPORTS_READ_MODEL, useClass: FinancialReportsReadPrisma },
    { provide: BILLING_SETTINGS_REPOSITORY, useClass: BillingSettingsPrismaRepository },
    { provide: INVOICE_WIZARD_READ_MODEL, useClass: InvoiceWizardReadPrisma },
    { provide: BILLABLE_SERVICES_READ_MODEL, useClass: BillableServicesReadPrisma },
    { provide: INVOICE_WRITE_REPOSITORY, useClass: InvoiceWritePrismaRepository },
    { provide: INVOICE_SEND_REPOSITORY, useClass: InvoiceSendPrismaRepository },
    { provide: ACCOUNT_DOCUMENT_REPOSITORY, useClass: AccountDocumentPrismaRepository },
    { provide: INVOICE_ATTACHMENT_REPOSITORY, useClass: InvoiceAttachmentPrismaRepository },
    { provide: INVOICE_PAYMENT_WRITE_REPOSITORY, useClass: InvoicePaymentWritePrismaRepository },
    { provide: INVOICE_EVENT_RECORDER, useClass: InvoiceEventPrismaRecorder },
    { provide: ADMIN_DIRECTORY, useClass: PrismaAdminDirectory },
  ],
})
export class AdminBillingModule {}
