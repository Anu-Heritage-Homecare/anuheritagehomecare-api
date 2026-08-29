import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForbiddenDomainException } from '@shared/domain/domain-exception';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { GetCurrentEarningsUseCase } from '../application/use-cases/get-current-earnings.use-case';
import { GetPayslipUseCase } from '../application/use-cases/get-payslip.use-case';
import { ListPayslipsUseCase } from '../application/use-cases/list-payslips.use-case';
import { EarningsResponseDto } from './dto/earnings-response.dto';
import { PayslipDetailResponseDto, PayslipSummaryResponseDto } from './dto/payslip-response.dto';

/**
 * Caregiver earnings (the wallet dashboard). Every route requires a valid access
 * token and is scoped to the authenticated caregiver, so they only ever see their
 * own earnings. The billing currency is derived server side from the caregiver's
 * country carried in the token.
 */
@ApiTags('caregiver-earnings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caregiver/earnings', version: '1' })
export class CaregiverEarningsController {
  constructor(
    private readonly getCurrentEarnings: GetCurrentEarningsUseCase,
    private readonly listPayslips: ListPayslipsUseCase,
    private readonly getPayslip: GetPayslipUseCase,
  ) {}

  @Get('current')
  @ApiOperation({ summary: "The caregiver's earnings for the current pay period" })
  @ApiOkResponse({ type: EarningsResponseDto })
  async current(@CurrentUser() principal: AuthenticatedPrincipal): Promise<EarningsResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.getCurrentEarnings.execute({
      caregiverId: principal.userId,
      country: principal.country,
    });
    return EarningsResponseDto.fromResult(result);
  }

  @Get('payslips')
  @ApiOperation({ summary: "The caregiver's payroll history (recent payslips)" })
  @ApiOkResponse({ type: [PayslipSummaryResponseDto] })
  async payslips(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<PayslipSummaryResponseDto[]> {
    this.assertCaregiver(principal);
    const results = await this.listPayslips.execute({ caregiverId: principal.userId });
    return results.map((result) => PayslipSummaryResponseDto.fromResult(result));
  }

  @Get('payslips/:id')
  @ApiOperation({ summary: 'The full detail of one payslip' })
  @ApiOkResponse({ type: PayslipDetailResponseDto })
  async payslip(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayslipDetailResponseDto> {
    this.assertCaregiver(principal);
    const result = await this.getPayslip.execute({ caregiverId: principal.userId, payslipId: id });
    return PayslipDetailResponseDto.fromResult(result);
  }

  private assertCaregiver(principal: AuthenticatedPrincipal): void {
    if (principal.userType !== String(UserType.Caregiver)) {
      throw new ForbiddenDomainException('Only caregivers can view earnings');
    }
  }
}
