import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Request to finish adding a card, echoing the setup handle from the start step. */
export class ConfirmPaymentMethodRequestDto {
  @ApiProperty({
    description: 'The setup reference returned by the start step and completed by the client',
    example: 'seti_1P0abcXY',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reference!: string;
}
