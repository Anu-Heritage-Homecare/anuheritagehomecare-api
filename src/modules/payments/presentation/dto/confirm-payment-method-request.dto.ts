import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request to finish adding a card, echoing the setup handle from the start step.
 * Carries only the setup reference and the display name the owner typed; the card
 * number, expiry and CVV are entered at the provider and never reach this service.
 */
export class ConfirmPaymentMethodRequestDto {
  @ApiProperty({
    description: 'The setup reference returned by the start step and completed by the client',
    example: 'seti_1P0abcXY',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reference!: string;

  @ApiPropertyOptional({
    description: 'The name the owner gave the card, for display (not the card data)',
    example: 'Raener Yaeger',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cardHolderName?: string;
}
