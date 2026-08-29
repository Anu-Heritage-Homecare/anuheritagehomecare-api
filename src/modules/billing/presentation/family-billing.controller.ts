import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { GetBillingDashboardUseCase } from '../application/use-cases/get-billing-dashboard.use-case';
import { GetInvoiceUseCase } from '../application/use-cases/get-invoice.use-case';
import { GetReceiptUseCase } from '../application/use-cases/get-receipt.use-case';
import { ListInvoicesUseCase } from '../application/use-cases/list-invoices.use-case';
import { ListReceiptsUseCase } from '../application/use-cases/list-receipts.use-case';
import {
  BillingDashboardResponseDto,
  InvoiceDetailResponseDto,
  InvoiceSummaryResponseDto,
  ReceiptResponseDto,
} from './dto/billing-response.dto';

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
