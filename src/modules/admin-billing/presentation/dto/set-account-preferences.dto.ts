import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Request to set a billing account's office preferences (the Edit Account form). */
export class SetAccountPreferencesRequestDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 'Bank Transfer',
    description: 'The preferred settlement method, or null to clear',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  preferredPaymentMethod?: string | null;
}
