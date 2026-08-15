import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { PaymentInitiationResult } from '../../application/dto/payment.result';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';

/**
 * HTTP response for a started payment. The client completes it with `clientSecret`
 * (Stripe) or by redirecting to `authorizationUrl` (Paystack). The booking is
 * only confirmed once the provider reports success (via webhook).
 */
export class PaymentInitiationResponseDto {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ enum: PaymentProvider, enumName: 'PaymentProvider' })
  provider!: PaymentProvider;

  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  status!: PaymentStatus;

  @ApiProperty({ enum: Currency, enumName: 'Currency' })
  currency!: Currency;

  @ApiProperty()
  amountMinor!: number;

  @ApiPropertyOptional({ nullable: true })
  clientSecret!: string | null;

  @ApiPropertyOptional({ nullable: true })
  authorizationUrl!: string | null;

  static fromResult(result: PaymentInitiationResult): PaymentInitiationResponseDto {
    const dto = new PaymentInitiationResponseDto();
    dto.paymentId = result.paymentId;
    dto.provider = result.provider;
    dto.status = result.status;
    dto.currency = result.currency;
    dto.amountMinor = result.amountMinor;
    dto.clientSecret = result.clientSecret;
    dto.authorizationUrl = result.authorizationUrl;
    return dto;
  }
}
