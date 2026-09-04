import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { AddPaymentMethodUseCase } from '../application/use-cases/add-payment-method.use-case';
import { InitiatePaymentUseCase } from '../application/use-cases/initiate-payment.use-case';
import { ListPaymentMethodsUseCase } from '../application/use-cases/list-payment-methods.use-case';
import { RemovePaymentMethodUseCase } from '../application/use-cases/remove-payment-method.use-case';
import { SetDefaultPaymentMethodUseCase } from '../application/use-cases/set-default-payment-method.use-case';
import { StartCardSetupUseCase } from '../application/use-cases/start-card-setup.use-case';
import { PayableType } from '../domain/payable-type.enum';
import { CardSetupResponseDto } from './dto/card-setup-response.dto';
import { ConfirmPaymentMethodRequestDto } from './dto/confirm-payment-method-request.dto';
import { InitiatePaymentRequestDto } from './dto/initiate-payment-request.dto';
import { PaymentInitiationResponseDto } from './dto/payment-initiation-response.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';

const SENSITIVE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

/**
 * HTTP entry point for starting payments and listing saved cards. JWT protected
 * and owner scoped. The charge amount and currency come from the payable itself,
 * so the client cannot influence what it is charged.
 */
@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly initiatePayment: InitiatePaymentUseCase,
    private readonly listMethods: ListPaymentMethodsUseCase,
    private readonly startCardSetup: StartCardSetupUseCase,
    private readonly addMethod: AddPaymentMethodUseCase,
    private readonly setDefaultMethod: SetDefaultPaymentMethodUseCase,
    private readonly removeMethod: RemovePaymentMethodUseCase,
  ) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Start paying for a booking or subscription' })
  @ApiCreatedResponse({ type: PaymentInitiationResponseDto })
  async initiate(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: InitiatePaymentRequestDto,
  ): Promise<PaymentInitiationResponseDto> {
    const result = await this.initiatePayment.execute({
      ownerId: principal.userId,
      ownerEmail: principal.email,
      payableType: body.payableType as PayableType,
      payableId: body.payableId,
    });
    return PaymentInitiationResponseDto.fromResult(result);
  }

  @Get('methods')
  @ApiOperation({ summary: 'List saved payment methods' })
  @ApiOkResponse({ type: PaymentMethodResponseDto, isArray: true })
  async methods(
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<PaymentMethodResponseDto[]> {
    const results = await this.listMethods.execute({ ownerId: principal.userId });
    return results.map((result) => PaymentMethodResponseDto.fromResult(result));
  }

  @Post('methods/setup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Begin adding a card (returns the provider setup handle)' })
  @ApiCreatedResponse({ type: CardSetupResponseDto })
  async setup(@CurrentUser() principal: AuthenticatedPrincipal): Promise<CardSetupResponseDto> {
    const result = await this.startCardSetup.execute({
      ownerId: principal.userId,
      ownerEmail: principal.email,
      country: principal.country,
    });
    return CardSetupResponseDto.fromResult(result);
  }

  @Post('methods/confirm')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({ summary: 'Finish adding a card the client tokenised at the provider' })
  @ApiCreatedResponse({ type: PaymentMethodResponseDto })
  async confirm(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: ConfirmPaymentMethodRequestDto,
  ): Promise<PaymentMethodResponseDto> {
    const result = await this.addMethod.execute({
      ownerId: principal.userId,
      country: principal.country,
      reference: body.reference,
    });
    return PaymentMethodResponseDto.fromResult(result);
  }

  @Put('methods/:id/default')
  @ApiOperation({ summary: 'Make a saved card the default' })
  @ApiOkResponse({ type: PaymentMethodResponseDto })
  async makeDefault(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentMethodResponseDto> {
    const result = await this.setDefaultMethod.execute({ ownerId: principal.userId, methodId: id });
    return PaymentMethodResponseDto.fromResult(result);
  }

  @Delete('methods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a saved card' })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.removeMethod.execute({ ownerId: principal.userId, methodId: id });
  }
}
