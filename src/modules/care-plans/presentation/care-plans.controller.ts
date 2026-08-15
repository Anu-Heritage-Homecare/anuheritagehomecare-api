import { Controller, Get, Param, ParseEnumPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { currencyForCountryCode } from '@shared/domain/currency.enum';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { GetCarePlanUseCase } from '../application/use-cases/get-care-plan.use-case';
import { ListCarePlansUseCase } from '../application/use-cases/list-care-plans.use-case';
import { CarePlanType } from '../domain/care-plan-type.enum';
import { CarePlanResponseDto } from './dto/care-plan-response.dto';

/**
 * Read only catalog of care plans. Prices are returned in the owner's currency,
 * which is derived server side from their market (never chosen by the client).
 */
@ApiTags('care-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'care-plans', version: '1' })
export class CarePlansController {
  constructor(
    private readonly listPlans: ListCarePlansUseCase,
    private readonly getPlan: GetCarePlanUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the care plans priced in the owner currency' })
  @ApiOkResponse({ type: CarePlanResponseDto, isArray: true })
  async findAll(@CurrentUser() principal: AuthenticatedPrincipal): Promise<CarePlanResponseDto[]> {
    const currency = currencyForCountryCode(principal.country);
    const results = await this.listPlans.execute({ currency });
    return results.map((result) => CarePlanResponseDto.fromResult(result));
  }

  @Get(':type')
  @ApiOperation({ summary: 'Fetch one care plan by type' })
  @ApiOkResponse({ type: CarePlanResponseDto })
  async findOne(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('type', new ParseEnumPipe(CarePlanType)) type: CarePlanType,
  ): Promise<CarePlanResponseDto> {
    const currency = currencyForCountryCode(principal.country);
    const result = await this.getPlan.execute({ type, currency });
    return CarePlanResponseDto.fromResult(result);
  }
}
