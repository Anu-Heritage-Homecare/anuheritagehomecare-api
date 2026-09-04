import { ApiProperty } from '@nestjs/swagger';
import { CardSetupInitiationResult } from '../../application/dto/card-setup.result';
import { PaymentProvider } from '../../domain/payment-provider.enum';

/**
 * HTTP response that starts adding a card. Carries the provider handle the app
 * completes the card entry with (a Stripe SetupIntent client secret or a Paystack
 * hosted page URL) plus the reference echoed back to confirm.
 */
export class CardSetupResponseDto {
  @ApiProperty({ enum: PaymentProvider, enumName: 'PaymentProvider' })
  provider!: PaymentProvider;

  @ApiProperty({ description: 'Echo this back to the confirm endpoint once setup completes' })
  reference!: string;

  @ApiProperty({ nullable: true, description: 'Stripe SetupIntent client secret, else null' })
  clientSecret!: string | null;

  @ApiProperty({ nullable: true, description: 'Paystack hosted page URL, else null' })
  authorizationUrl!: string | null;

  static fromResult(result: CardSetupInitiationResult): CardSetupResponseDto {
    const dto = new CardSetupResponseDto();
    dto.provider = result.provider;
    dto.reference = result.reference;
    dto.clientSecret = result.clientSecret;
    dto.authorizationUrl = result.authorizationUrl;
    return dto;
  }
}
