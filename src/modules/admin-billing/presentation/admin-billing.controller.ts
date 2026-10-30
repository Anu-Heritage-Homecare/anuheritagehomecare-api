import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { AdminJwtAuthGuard } from '@shared/presentation/admin-jwt-auth.guard';
import { CreateBillingAccountUseCase } from '../application/use-cases/create-billing-account.use-case';
import { GetBillingDashboardUseCase } from '../application/use-cases/get-billing-dashboard.use-case';
import { ListBillingAccountsUseCase } from '../application/use-cases/list-billing-accounts.use-case';
import { BillingAccountsQueryDto } from './dto/billing-accounts-query.dto';
import { BillingAccountsResponseDto } from './dto/billing-accounts-response.dto';
import { BillingDashboardQueryDto } from './dto/billing-dashboard-query.dto';
import { BillingDashboardResponseDto } from './dto/billing-dashboard-response.dto';
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
    private readonly createAccount: CreateBillingAccountUseCase,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'The whole Billing dashboard for one market: KPIs, revenue trend, aging, payments, activity',
  })
  @ApiOkResponse({ type: BillingDashboardResponseDto })
  async dashboard(@Query() query: BillingDashboardQueryDto): Promise<BillingDashboardResponseDto> {
    const result = await this.getDashboard.execute({
      currency: query.currency ?? Currency.NigerianNaira,
    });
    return BillingDashboardResponseDto.fromResult(result);
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
