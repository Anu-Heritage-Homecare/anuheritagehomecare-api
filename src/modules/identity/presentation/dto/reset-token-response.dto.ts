import { ApiProperty } from '@nestjs/swagger';
import { ResetTokenResult } from '../../application/dto/reset-token.result';

/** HTTP response carrying the short lived token that authorises a password reset. */
export class ResetTokenResponseDto {
  @ApiProperty({ description: 'Short lived token to submit with the new password' })
  resetToken!: string;

  static fromResult(result: ResetTokenResult): ResetTokenResponseDto {
    const dto = new ResetTokenResponseDto();
    dto.resetToken = result.resetToken;
    return dto;
  }
}
