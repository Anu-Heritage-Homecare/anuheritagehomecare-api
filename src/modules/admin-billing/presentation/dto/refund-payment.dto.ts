import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/** Refund a recorded payment, in full or in part (the Create Refund modal). */
export class RefundPaymentRequestDto {
  @ApiProperty({
    minimum: 1,
    description: 'Refund amount in minor units; must not exceed the payment balance',
  })
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @ApiPropertyOptional({ example: 'Bank Transfer', description: 'How the refund was issued' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  method?: string;

  @ApiPropertyOptional({
    example: 'Overpayment',
    maxLength: 200,
    description: 'Why it was refunded',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Notes for the audit trail' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
