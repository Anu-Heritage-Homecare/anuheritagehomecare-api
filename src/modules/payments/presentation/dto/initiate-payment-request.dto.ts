import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { PayableType } from '../../domain/payable-type.enum';

/** Request contract to start paying for a booking or subscription. */
export class InitiatePaymentRequestDto {
  @ApiProperty({ enum: PayableType, enumName: 'PayableType' })
  @IsIn(Object.values(PayableType))
  payableType!: string;

  @ApiProperty({ format: 'uuid', description: 'The booking or subscription id' })
  @IsUUID('4')
  payableId!: string;
}
