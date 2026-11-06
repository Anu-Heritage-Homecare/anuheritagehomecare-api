import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Refund a recorded payment. */
export class RefundPaymentRequestDto {
  @ApiPropertyOptional({ maxLength: 500, description: 'Why the payment was refunded' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
