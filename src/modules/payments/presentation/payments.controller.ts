import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedPrincipal } from '@shared/presentation/authenticated-principal';
import { CurrentUser } from '@shared/presentation/current-user.decorator';
import { JwtAuthGuard } from '@shared/presentation/jwt-auth.guard';
import { InitiatePaymentUseCase } from '../application/use-cases/initiate-payment.use-case';
import { ListPaymentMethodsUseCase } from '../application/use-cases/list-payment-methods.use-case';
import { PayableType } from '../domain/payable-type.enum';
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
}
