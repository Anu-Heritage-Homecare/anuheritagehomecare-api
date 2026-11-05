import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { AdminPrincipal } from '@shared/presentation/admin-principal';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { CurrentAdmin } from '@shared/presentation/current-admin.decorator';
import { AddInvoiceNoteUseCase } from '../application/use-cases/add-invoice-note.use-case';
import { ApproveAccountAdjustmentUseCase } from '../application/use-cases/approve-account-adjustment.use-case';
import { CreateAccountAdjustmentUseCase } from '../application/use-cases/create-account-adjustment.use-case';
import { CreateBillingAccountUseCase } from '../application/use-cases/create-billing-account.use-case';
import { ListAccountAdjustmentsUseCase } from '../application/use-cases/list-account-adjustments.use-case';
import { ReverseAccountAdjustmentUseCase } from '../application/use-cases/reverse-account-adjustment.use-case';
import { GetBillingAccountActivityUseCase } from '../application/use-cases/get-billing-account-activity.use-case';
import { GetBillingAccountUseCase } from '../application/use-cases/get-billing-account.use-case';
import { GetBillingDashboardUseCase } from '../application/use-cases/get-billing-dashboard.use-case';
import { GetBillingSettingsUseCase } from '../application/use-cases/get-billing-settings.use-case';
import { GetFinancialReportUseCase } from '../application/use-cases/get-financial-report.use-case';
import { GetInvoiceAccountPreviewUseCase } from '../application/use-cases/get-invoice-account-preview.use-case';
import { GetRecipientServicePreviewUseCase } from '../application/use-cases/get-recipient-service-preview.use-case';
import { ListBillableServicesUseCase } from '../application/use-cases/list-billable-services.use-case';
import { ComputeInvoiceTotalsUseCase } from '../application/use-cases/compute-invoice-totals.use-case';
import { CreateInvoiceUseCase } from '../application/use-cases/create-invoice.use-case';
import { SendInvoiceUseCase } from '../application/use-cases/send-invoice.use-case';
import { UpdateBillingSettingsUseCase } from '../application/use-cases/update-billing-settings.use-case';
import { UpdatePaymentMethodUseCase } from '../application/use-cases/update-payment-method.use-case';
import { BillingPaymentMethodKind } from '../domain/billing-payment-method-kind.enum';
import { ListInvoiceNotesUseCase } from '../application/use-cases/list-invoice-notes.use-case';
import { GetBillingInvoiceHistoryUseCase } from '../application/use-cases/get-billing-invoice-history.use-case';
import { GetBillingInvoiceServicesUseCase } from '../application/use-cases/get-billing-invoice-services.use-case';
import { GetBillingInvoiceUseCase } from '../application/use-cases/get-billing-invoice.use-case';
import { ListBillingAccountInvoicesUseCase } from '../application/use-cases/list-billing-account-invoices.use-case';
import { ListBillingInvoicePaymentsUseCase } from '../application/use-cases/list-billing-invoice-payments.use-case';
import { ListBillingAccountPaymentsUseCase } from '../application/use-cases/list-billing-account-payments.use-case';
import { ListBillingAccountRecipientsUseCase } from '../application/use-cases/list-billing-account-recipients.use-case';
import { ListBillingAccountsUseCase } from '../application/use-cases/list-billing-accounts.use-case';
import { ListBillingInvoicesUseCase } from '../application/use-cases/list-billing-invoices.use-case';
import { ListBillingPaymentsUseCase } from '../application/use-cases/list-billing-payments.use-case';
import { BillingAccountActivityResponseDto } from './dto/billing-account-activity-response.dto';
import { BillingAccountDetailResponseDto } from './dto/billing-account-detail-response.dto';
import { BillingAccountInvoicesResponseDto } from './dto/billing-account-invoices-response.dto';
import { BillingAccountPaymentsResponseDto } from './dto/billing-account-payments-response.dto';
import { BillingAccountRecipientsResponseDto } from './dto/billing-account-recipients-response.dto';
import { BillingAccountsQueryDto } from './dto/billing-accounts-query.dto';
import { BillingAccountsResponseDto } from './dto/billing-accounts-response.dto';
import { BillingInvoiceDetailResponseDto } from './dto/billing-invoice-detail-response.dto';
import { AddInvoiceNoteRequestDto, InvoiceNoteCreatedDto } from './dto/add-invoice-note.dto';
import { BillingInvoiceHistoryResponseDto } from './dto/billing-invoice-history-response.dto';
import { BillingInvoiceNotesResponseDto } from './dto/billing-invoice-notes-response.dto';
import { BillingInvoicePaymentsResponseDto } from './dto/billing-invoice-payments-response.dto';
import { BillingInvoiceServicesResponseDto } from './dto/billing-invoice-services-response.dto';
import { BillingInvoicesQueryDto } from './dto/billing-invoices-query.dto';
import { BillingInvoicesResponseDto } from './dto/billing-invoices-response.dto';
import { BillingPaymentsQueryDto } from './dto/billing-payments-query.dto';
import { BillingPaymentsResponseDto } from './dto/billing-payments-response.dto';
import { BillingDashboardQueryDto } from './dto/billing-dashboard-query.dto';
import { AdminBillingDashboardResponseDto } from './dto/billing-dashboard-response.dto';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import { FinancialReportResponseDto } from './dto/financial-report-response.dto';
import {
  BillingPaymentMethodResponseDto,
  BillingSettingsResponseDto,
} from './dto/billing-settings-response.dto';
import { UpdateBillingSettingsRequestDto } from './dto/update-billing-settings.dto';
import { UpdatePaymentMethodRequestDto } from './dto/update-payment-method.dto';
import { InvoiceAccountPreviewResponseDto } from './dto/invoice-account-preview-response.dto';
import { RecipientServicePreviewResponseDto } from './dto/recipient-service-preview-response.dto';
import { BillableServicesResponseDto } from './dto/billable-services-response.dto';
import { ComputeInvoiceTotalsRequestDto } from './dto/compute-invoice-totals.dto';
import { InvoiceTotalsResponseDto } from './dto/invoice-totals-response.dto';
import { CreateInvoiceRequestDto } from './dto/create-invoice.dto';
import { InvoiceCreatedResponseDto } from './dto/invoice-created-response.dto';
import { InvoiceSentResponseDto } from './dto/invoice-sent-response.dto';
import { AccountAdjustmentsQueryDto } from './dto/account-adjustments-query.dto';
import { AccountAdjustmentsResponseDto } from './dto/account-adjustments-response.dto';
import {
  AccountAdjustmentApprovedDto,
  AccountAdjustmentCreatedDto,
  AccountAdjustmentReversedDto,
  CreateAccountAdjustmentRequestDto,
} from './dto/create-account-adjustment.dto';
import {
  BillingAccountCreatedDto,
  CreateBillingAccountRequestDto,
} from './dto/create-billing-account.dto';

/**
 * Admin Billing control panel. The financial overview dashboard and the Billing
 * Accounts directory (accounts with balances, filterable and paginated, plus opening
 * a new account). Every route requires a valid admin token.
 */
@ApiTags('admin-billing')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/billing', version: '1' })
export class AdminBillingController {
  constructor(
    private readonly getDashboard: GetBillingDashboardUseCase,
    private readonly listAccounts: ListBillingAccountsUseCase,
    private readonly getAccount: GetBillingAccountUseCase,
    private readonly listRecipients: ListBillingAccountRecipientsUseCase,
    private readonly listInvoices: ListBillingAccountInvoicesUseCase,
    private readonly listPayments: ListBillingAccountPaymentsUseCase,
    private readonly getActivity: GetBillingAccountActivityUseCase,
    private readonly listInvoicesAll: ListBillingInvoicesUseCase,
    private readonly listPaymentsAll: ListBillingPaymentsUseCase,
    private readonly getInvoice: GetBillingInvoiceUseCase,
    private readonly getInvoiceServices: GetBillingInvoiceServicesUseCase,
    private readonly listInvoicePayments: ListBillingInvoicePaymentsUseCase,
    private readonly getInvoiceHistory: GetBillingInvoiceHistoryUseCase,
    private readonly listInvoiceNotes: ListInvoiceNotesUseCase,
    private readonly addInvoiceNote: AddInvoiceNoteUseCase,
    private readonly createAccount: CreateBillingAccountUseCase,
    private readonly listAdjustments: ListAccountAdjustmentsUseCase,
    private readonly createAdjustment: CreateAccountAdjustmentUseCase,
    private readonly approveAdjustment: ApproveAccountAdjustmentUseCase,
    private readonly reverseAdjustment: ReverseAccountAdjustmentUseCase,
    private readonly getFinancialReport: GetFinancialReportUseCase,
    private readonly getSettings: GetBillingSettingsUseCase,
    private readonly updateSettings: UpdateBillingSettingsUseCase,
    private readonly updatePaymentMethod: UpdatePaymentMethodUseCase,
    private readonly getInvoiceAccountPreview: GetInvoiceAccountPreviewUseCase,
    private readonly getRecipientServicePreview: GetRecipientServicePreviewUseCase,
    private readonly listBillableServices: ListBillableServicesUseCase,
    private readonly computeInvoiceTotals: ComputeInvoiceTotalsUseCase,
    private readonly createInvoice: CreateInvoiceUseCase,
    private readonly sendInvoice: SendInvoiceUseCase,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'The whole Billing dashboard for one market: KPIs, revenue trend, aging, payments, activity',
  })
  @ApiOkResponse({ type: AdminBillingDashboardResponseDto })
  async dashboard(
    @Query() query: BillingDashboardQueryDto,
  ): Promise<AdminBillingDashboardResponseDto> {
    const result = await this.getDashboard.execute({
      currency: query.currency ?? Currency.NigerianNaira,
    });
    return AdminBillingDashboardResponseDto.fromResult(result);
  }

  @Get('reports/financial')
  @ApiOperation({
    summary:
      'The Financial Reports screen: KPIs with deltas, monthly revenue, collections by method, aging',
  })
  @ApiOkResponse({ type: FinancialReportResponseDto })
  async financialReport(
    @Query() query: FinancialReportQueryDto,
  ): Promise<FinancialReportResponseDto> {
    const result = await this.getFinancialReport.execute({
      currency: query.currency ?? Currency.NigerianNaira,
      from: query.from === undefined ? null : new Date(query.from),
      to: query.to === undefined ? null : new Date(query.to),
      branch: query.branch ?? null,
      comparison: query.comparison ?? 'PREVIOUS_PERIOD',
    });
    return FinancialReportResponseDto.fromResult(result);
  }

  @Get('settings')
  @ApiOperation({
    summary: 'The Billing Settings screen: invoice, automation, notifications, methods',
  })
  @ApiOkResponse({ type: BillingSettingsResponseDto })
  async settings(): Promise<BillingSettingsResponseDto> {
    return BillingSettingsResponseDto.fromResult(await this.getSettings.execute());
  }

  @Put('settings')
  @ApiOperation({ summary: 'Save the invoice, automation and notification preferences' })
  @ApiOkResponse({ type: BillingSettingsResponseDto })
  async saveSettings(
    @Body() body: UpdateBillingSettingsRequestDto,
  ): Promise<BillingSettingsResponseDto> {
    return BillingSettingsResponseDto.fromResult(await this.updateSettings.execute(body));
  }

  @Put('settings/payment-methods/:method')
  @ApiOperation({ summary: 'Enable, disable or re describe one payment avenue (the Edit action)' })
  @ApiOkResponse({ type: BillingPaymentMethodResponseDto })
  async savePaymentMethod(
    @Param('method', new ParseEnumPipe(BillingPaymentMethodKind)) method: BillingPaymentMethodKind,
    @Body() body: UpdatePaymentMethodRequestDto,
  ): Promise<BillingPaymentMethodResponseDto> {
    const result = await this.updatePaymentMethod.execute({
      method,
      enabled: body.enabled,
      description: body.description,
    });
    return BillingPaymentMethodResponseDto.fromResult(result);
  }

  @Get('invoice-wizard/accounts/:id')
  @ApiOperation({
    summary: 'The Account Details Preview for the Create Invoice wizard (step 1)',
  })
  @ApiOkResponse({ type: InvoiceAccountPreviewResponseDto })
  async invoiceWizardAccount(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceAccountPreviewResponseDto> {
    const result = await this.getInvoiceAccountPreview.execute(id);
    return InvoiceAccountPreviewResponseDto.fromResult(result);
  }

  @Get('invoice-wizard/recipients/:id')
  @ApiOperation({
    summary: 'The Service Details Preview for the Create Invoice wizard (step 2)',
  })
  @ApiOkResponse({ type: RecipientServicePreviewResponseDto })
  async invoiceWizardRecipient(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipientServicePreviewResponseDto> {
    const result = await this.getRecipientServicePreview.execute(id);
    return RecipientServicePreviewResponseDto.fromResult(result);
  }

  @Get('billable-services')
  @ApiOperation({
    summary: 'The billable services catalog for a market (Create Invoice wizard, step 3)',
  })
  @ApiOkResponse({ type: BillableServicesResponseDto })
  async billableServices(
    @Query() query: BillingDashboardQueryDto,
  ): Promise<BillableServicesResponseDto> {
    const result = await this.listBillableServices.execute(
      query.currency ?? Currency.NigerianNaira,
    );
    return BillableServicesResponseDto.fromResult(result);
  }

  @Post('invoice-wizard/compute-totals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compute the authoritative invoice totals with discounts and tax (wizard step 4)',
  })
  @ApiOkResponse({ type: InvoiceTotalsResponseDto })
  async invoiceWizardTotals(
    @Body() body: ComputeInvoiceTotalsRequestDto,
  ): Promise<InvoiceTotalsResponseDto> {
    const result = await this.computeInvoiceTotals.execute({
      currency: body.currency ?? Currency.NigerianNaira,
      lines: body.lines,
      discounts: body.discounts ?? [],
      adjustments: body.adjustments ?? [],
    });
    return InvoiceTotalsResponseDto.fromResult(result);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Raise an invoice from the Create Invoice wizard (step 5)' })
  @ApiCreatedResponse({ type: InvoiceCreatedResponseDto })
  async createInvoiceFromWizard(
    @Body() body: CreateInvoiceRequestDto,
  ): Promise<InvoiceCreatedResponseDto> {
    const result = await this.createInvoice.execute({
      careRecipientId: body.careRecipientId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      paymentTermsDays: body.paymentTermsDays ?? null,
      insuranceCoveredMinor: body.insuranceCoveredMinor ?? 0,
      currency: body.currency ?? Currency.NigerianNaira,
      lines: body.lines,
      discounts: body.discounts ?? [],
      adjustments: body.adjustments ?? [],
    });
    return InvoiceCreatedResponseDto.fromResult(result);
  }

  @Post('invoices/:id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a raised invoice to the client (Create Invoice wizard, step 6)' })
  @ApiOkResponse({ type: InvoiceSentResponseDto })
  async sendInvoiceToClient(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceSentResponseDto> {
    const result = await this.sendInvoice.execute({ invoiceId: id });
    return InvoiceSentResponseDto.fromResult(result);
  }

  @Get('invoices')
  @ApiOperation({
    summary: 'The org wide Invoices list across accounts, with status tab counts and paging',
  })
  @ApiOkResponse({ type: BillingInvoicesResponseDto })
  async invoices(@Query() query: BillingInvoicesQueryDto): Promise<BillingInvoicesResponseDto> {
    const result = await this.listInvoicesAll.execute({
      status: query.status ?? null,
      search: query.search ?? null,
      billingAccountId: query.billingAccountId ?? null,
      dueFrom: query.dueFrom === undefined ? null : new Date(query.dueFrom),
      dueTo: query.dueTo === undefined ? null : new Date(query.dueTo),
      minAmountMinor: query.minAmountMinor ?? null,
      maxAmountMinor: query.maxAmountMinor ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? null,
    });
    return BillingInvoicesResponseDto.fromResult(result);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'The org wide Payments list across accounts, with status tab counts and paging',
  })
  @ApiOkResponse({ type: BillingPaymentsResponseDto })
  async payments(@Query() query: BillingPaymentsQueryDto): Promise<BillingPaymentsResponseDto> {
    const result = await this.listPaymentsAll.execute({
      status: query.status ?? null,
      search: query.search ?? null,
      billingAccountId: query.billingAccountId ?? null,
      method: query.method ?? null,
      receivedFrom: query.receivedFrom === undefined ? null : new Date(query.receivedFrom),
      receivedTo: query.receivedTo === undefined ? null : new Date(query.receivedTo),
      minAmountMinor: query.minAmountMinor ?? null,
      maxAmountMinor: query.maxAmountMinor ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? null,
    });
    return BillingPaymentsResponseDto.fromResult(result);
  }

  @Get('invoices/:id')
  @ApiOperation({
    summary: 'One invoice (the Overview tab): details, payment summary and line items',
  })
  @ApiOkResponse({ type: BillingInvoiceDetailResponseDto })
  async invoice(@Param('id', ParseUUIDPipe) id: string): Promise<BillingInvoiceDetailResponseDto> {
    const result = await this.getInvoice.execute(id);
    return BillingInvoiceDetailResponseDto.fromResult(result);
  }

  @Get('invoices/:id/services')
  @ApiOperation({ summary: "An invoice's billed service lines (the Services tab)" })
  @ApiOkResponse({ type: BillingInvoiceServicesResponseDto })
  async invoiceServices(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingInvoiceServicesResponseDto> {
    const result = await this.getInvoiceServices.execute(id);
    return BillingInvoiceServicesResponseDto.fromResult(result);
  }

  @Get('invoices/:id/payments')
  @ApiOperation({ summary: 'Payments recorded against one invoice (the invoice Payments tab)' })
  @ApiOkResponse({ type: BillingInvoicePaymentsResponseDto })
  async invoicePayments(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingInvoicePaymentsResponseDto> {
    const result = await this.listInvoicePayments.execute(id);
    return BillingInvoicePaymentsResponseDto.fromResult(result);
  }

  @Get('invoices/:id/history')
  @ApiOperation({ summary: 'The evidenced invoice lifecycle timeline (the History tab)' })
  @ApiOkResponse({ type: BillingInvoiceHistoryResponseDto })
  async invoiceHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingInvoiceHistoryResponseDto> {
    const result = await this.getInvoiceHistory.execute(id);
    return BillingInvoiceHistoryResponseDto.fromResult(result);
  }

  @Get('invoices/:id/notes')
  @ApiOperation({ summary: 'The internal notes on an invoice (the Notes tab), newest first' })
  @ApiOkResponse({ type: BillingInvoiceNotesResponseDto })
  async invoiceNotes(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingInvoiceNotesResponseDto> {
    const result = await this.listInvoiceNotes.execute(id);
    return BillingInvoiceNotesResponseDto.fromResult(result);
  }

  @Post('invoices/:id/notes')
  @ApiOperation({ summary: 'Add an internal note to an invoice (the Add Note action)' })
  @ApiCreatedResponse({ type: InvoiceNoteCreatedDto })
  async createInvoiceNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddInvoiceNoteRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<InvoiceNoteCreatedDto> {
    return this.addInvoiceNote.execute({
      invoiceId: id,
      authorId: admin.adminUserId,
      category: body.category,
      body: body.body,
    });
  }

  @Get('accounts')
  @ApiOperation({
    summary: 'The Billing Accounts list for a tab, with per tab counts, branches and paging',
  })
  @ApiOkResponse({ type: BillingAccountsResponseDto })
  async accounts(@Query() query: BillingAccountsQueryDto): Promise<BillingAccountsResponseDto> {
    const result = await this.listAccounts.execute({
      tab: query.tab ?? 'ALL',
      search: query.search ?? null,
      branch: query.branch ?? null,
      status: query.status ?? null,
      minBalanceMinor: query.minBalanceMinor ?? null,
      maxBalanceMinor: query.maxBalanceMinor ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? null,
    });
    return BillingAccountsResponseDto.fromResult(result);
  }

  @Get('accounts/:id')
  @ApiOperation({
    summary: 'One billing account (the Overview tab): summary, financials, invoices, timeline',
  })
  @ApiOkResponse({ type: BillingAccountDetailResponseDto })
  async account(@Param('id', ParseUUIDPipe) id: string): Promise<BillingAccountDetailResponseDto> {
    const result = await this.getAccount.execute(id);
    return BillingAccountDetailResponseDto.fromResult(result);
  }

  @Get('accounts/:id/care-recipients')
  @ApiOperation({
    summary: 'The care recipients billed under an account (the Care Recipients tab)',
  })
  @ApiOkResponse({ type: BillingAccountRecipientsResponseDto })
  async accountRecipients(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingAccountRecipientsResponseDto> {
    const result = await this.listRecipients.execute(id);
    return BillingAccountRecipientsResponseDto.fromResult(result);
  }

  @Get('accounts/:id/invoices')
  @ApiOperation({ summary: 'Every invoice billed to an account (the Invoices tab), newest first' })
  @ApiOkResponse({ type: BillingAccountInvoicesResponseDto })
  async accountInvoices(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingAccountInvoicesResponseDto> {
    const result = await this.listInvoices.execute(id);
    return BillingAccountInvoicesResponseDto.fromResult(result);
  }

  @Get('accounts/:id/payments')
  @ApiOperation({
    summary: 'Every recorded payment on an account (the Payments tab), newest first',
  })
  @ApiOkResponse({ type: BillingAccountPaymentsResponseDto })
  async accountPayments(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingAccountPaymentsResponseDto> {
    const result = await this.listPayments.execute(id);
    return BillingAccountPaymentsResponseDto.fromResult(result);
  }

  @Get('accounts/:id/activity')
  @ApiOperation({
    summary: 'The full account billing and care activity timeline (the Activity tab)',
  })
  @ApiOkResponse({ type: BillingAccountActivityResponseDto })
  async accountActivity(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BillingAccountActivityResponseDto> {
    const result = await this.getActivity.execute(id);
    return BillingAccountActivityResponseDto.fromResult(result);
  }

  @Get('adjustments')
  @ApiOperation({
    summary: 'The Credits & Adjustments list for a tab, with per category counts and paging',
  })
  @ApiOkResponse({ type: AccountAdjustmentsResponseDto })
  async adjustments(
    @Query() query: AccountAdjustmentsQueryDto,
  ): Promise<AccountAdjustmentsResponseDto> {
    const result = await this.listAdjustments.execute({
      category: query.category ?? null,
      status: query.status ?? null,
      type: query.type ?? null,
      search: query.search ?? null,
      minAmountMinor: query.minAmountMinor ?? null,
      maxAmountMinor: query.maxAmountMinor ?? null,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? null,
    });
    return AccountAdjustmentsResponseDto.fromResult(result);
  }

  @Post('adjustments')
  @ApiOperation({ summary: 'Raise a credit, refund, write off or adjustment (Create Adjustment)' })
  @ApiCreatedResponse({ type: AccountAdjustmentCreatedDto })
  async createAccountAdjustment(
    @Body() body: CreateAccountAdjustmentRequestDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AccountAdjustmentCreatedDto> {
    return this.createAdjustment.execute({
      category: body.category,
      type: body.type,
      billingAccountId: body.billingAccountId,
      amountMinor: body.amountMinor,
      currency: body.currency,
      reason: body.reason,
      createdById: admin.adminUserId,
    });
  }

  @Post('adjustments/:id/approve')
  @ApiOperation({ summary: 'Approve a correction awaiting approval (the Approve action)' })
  @ApiOkResponse({ type: AccountAdjustmentApprovedDto })
  async approveAccountAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AccountAdjustmentApprovedDto> {
    return this.approveAdjustment.execute({ id, approvedById: admin.adminUserId });
  }

  @Post('adjustments/:id/reverse')
  @ApiOperation({ summary: 'Reverse (void) a correction (the Reverse action)' })
  @ApiOkResponse({ type: AccountAdjustmentReversedDto })
  async reverseAccountAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<AccountAdjustmentReversedDto> {
    return this.reverseAdjustment.execute({ id, reversedById: admin.adminUserId });
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Open a new billing account with its primary contact' })
  @ApiOkResponse({ type: BillingAccountCreatedDto })
  async openAccount(
    @Body() body: CreateBillingAccountRequestDto,
  ): Promise<BillingAccountCreatedDto> {
    return this.createAccount.execute({
      accountName: body.accountName,
      primaryContact: body.primaryContact,
      phone: body.phone ?? null,
      branch: body.branch ?? null,
    });
  }
}
