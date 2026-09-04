import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { GetBillingDashboardUseCase } from '../application/use-cases/get-billing-dashboard.use-case';
import { GetInvoiceUseCase } from '../application/use-cases/get-invoice.use-case';
import { GetReceiptUseCase } from '../application/use-cases/get-receipt.use-case';
import { ListInvoicesUseCase } from '../application/use-cases/list-invoices.use-case';
import { ListReceiptsUseCase } from '../application/use-cases/list-receipts.use-case';
import { PayInvoiceUseCase } from '../application/use-cases/pay-invoice.use-case';
import { UpgradeSubscriptionPlanUseCase } from '../application/use-cases/upgrade-subscription-plan.use-case';
import {
  BillingDashboardResponseDto,
  InvoiceDetailResponseDto,
  InvoiceSummaryResponseDto,
  PayInvoiceResponseDto,
  ReceiptResponseDto,
  UpgradedPlanResponseDto,
} from './dto/billing-response.dto';
import { UpgradePlanRequestDto } from './dto/upgrade-plan-request.dto';

/**
 * Family owner billing reads (the Billing tab). Every route requires a valid
 * access token and is scoped to the owner, who only ever sees their own plan,
 * invoices and receipts.
 */
@ApiTags('family-billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'family/billing', version: '1' })
export class FamilyBillingController {
  constructor(
    private readonly getDashboard: GetBillingDashboardUseCase,
    private readonly listInvoices: ListInvoicesUseCase,
    private readonly getInvoice: GetInvoiceUseCase,
    private readonly listReceipts: ListReceiptsUseCase,
    private readonly getReceipt: GetReceiptUseCase,
    private readonly payInvoiceUseCase: PayInvoiceUseCase,
    private readonly upgradePlan: UpgradeSubscriptionPlanUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The billing dashboard: plan card and billing summary' })
  @ApiOkResponse({ type: BillingDashboardResponseDto })
  async dashboard(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<BillingDashboardResponseDto> {
    const result = await this.getDashboard.execute({ ownerId: principal.userId });
    return BillingDashboardResponseDto.fromResult(result);
  }

  @Get('invoices')
  @ApiOperation({ summary: "The owner's invoices, newest first" })
  @ApiOkResponse({ type: [InvoiceSummaryResponseDto] })
  async invoices(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<InvoiceSummaryResponseDto[]> {
    const results = await this.listInvoices.execute({ ownerId: principal.userId });
    return results.map((result) => InvoiceSummaryResponseDto.fromResult(result));
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'One invoice in full' })
  @ApiOkResponse({ type: InvoiceDetailResponseDto })
  async invoice(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceDetailResponseDto> {
    const result = await this.getInvoice.execute({ ownerId: principal.userId, invoiceId: id });
    return InvoiceDetailResponseDto.fromDetail(result);
  }

  @Post('invoices/:id/pay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start paying an invoice' })
  @ApiCreatedResponse({ type: PayInvoiceResponseDto })
  async payInvoice(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayInvoiceResponseDto> {
    const result = await this.payInvoiceUseCase.execute({
      ownerId: principal.userId,
      ownerEmail: principal.email,
      invoiceId: id,
    });
    return PayInvoiceResponseDto.fromResult(result);
  }

  @Post('subscriptions/:id/upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a subscription onto a different plan (Upgrade Plan)' })
  @ApiOkResponse({ type: UpgradedPlanResponseDto })
  async upgradeSubscription(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpgradePlanRequestDto,
  ): Promise<UpgradedPlanResponseDto> {
    const result = await this.upgradePlan.execute({
      ownerId: principal.userId,
      subscriptionId: id,
      planType: body.planType,
    });
    return UpgradedPlanResponseDto.fromResult(result);
  }

  @Get('receipts')
  @ApiOperation({ summary: "The owner's receipts (settled payments), newest first" })
  @ApiOkResponse({ type: [ReceiptResponseDto] })
  async receipts(@CurrentUser() principal: AuthenticatedPrincipal): Promise<ReceiptResponseDto[]> {
    const results = await this.listReceipts.execute({ ownerId: principal.userId });
    return results.map((result) => ReceiptResponseDto.fromResult(result));
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'One receipt in full' })
  @ApiOkResponse({ type: ReceiptResponseDto })
  async receipt(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReceiptResponseDto> {
    const result = await this.getReceipt.execute({ ownerId: principal.userId, receiptId: id });
    return ReceiptResponseDto.fromResult(result);
  }
}
