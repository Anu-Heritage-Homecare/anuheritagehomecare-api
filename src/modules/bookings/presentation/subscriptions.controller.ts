import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { currencyForCountryCode } from '@shared/domain/currency.enum';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { CreateSubscriptionUseCase } from '../application/use-cases/create-subscription.use-case';
import { ListSubscriptionsUseCase } from '../application/use-cases/list-subscriptions.use-case';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';

/**
 * HTTP entry point for monthly plan subscriptions (Standard, Premium, Live in).
 * JWT protected and owner scoped; pricing currency comes from the owner market.
 */
@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(
    private readonly createSubscription: CreateSubscriptionUseCase,
    private readonly listSubscriptions: ListSubscriptionsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe a care recipient to a monthly plan (awaiting payment)' })
  @ApiCreatedResponse({ type: SubscriptionResponseDto })
  async create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: CreateSubscriptionRequestDto,
  ): Promise<SubscriptionResponseDto> {
    const result = await this.createSubscription.execute({
      ownerId: principal.userId,
      currency: currencyForCountryCode(principal.country),
      careRecipientId: body.careRecipientId,
      planType: body.planType,
      startDate: body.startDate,
    });
    return SubscriptionResponseDto.fromResult(result);
  }

  @Get()
  @ApiOperation({ summary: 'List the owner subscriptions' })
  @ApiOkResponse({ type: SubscriptionResponseDto, isArray: true })
  async findAll(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<SubscriptionResponseDto[]> {
    const results = await this.listSubscriptions.execute({ ownerId: principal.userId });
    return results.map((result) => SubscriptionResponseDto.fromResult(result));
  }
}
