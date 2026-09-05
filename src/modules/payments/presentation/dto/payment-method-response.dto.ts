import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodResult } from '../../application/dto/payment-method.result';
import { PaymentProvider } from '../../domain/payment-provider.enum';

/** HTTP response for a saved payment method. Never exposes the raw card. */
export class PaymentMethodResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentProvider, enumName: 'PaymentProvider' })
  provider!: PaymentProvider;

  @ApiProperty({ example: 'Visa' })
  brand!: string;

  @ApiProperty({ example: '2417' })
  last4!: string;

  @ApiProperty({ example: 12 })
  expMonth!: number;

  @ApiProperty({ example: 2028 })
  expYear!: number;

  @ApiProperty({ nullable: true, example: 'Raener Yaeger' })
  cardHolderName!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  static fromResult(result: PaymentMethodResult): PaymentMethodResponseDto {
    const dto = new PaymentMethodResponseDto();
    dto.id = result.id;
    dto.provider = result.provider;
    dto.brand = result.brand;
    dto.last4 = result.last4;
    dto.expMonth = result.expMonth;
    dto.expYear = result.expYear;
    dto.cardHolderName = result.cardHolderName;
    dto.isDefault = result.isDefault;
    return dto;
  }
}
