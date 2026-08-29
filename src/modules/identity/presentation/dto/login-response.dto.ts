import { ApiProperty } from '@nestjs/swagger';
import { LoginResult } from '../../application/dto/login.result';
import { AuthTokensResponseDto } from './auth-tokens-response.dto';

/**
 * The response to a password login. When two factor is off, `tokens` is
 * populated and the client is signed in. When it is on, `twoFactorRequired` is
 * true and `challengeToken` must be sent with the second factor to finish.
 */
export class LoginResponseDto {
  @ApiProperty({ description: 'True when a second factor is required to finish signing in' })
  twoFactorRequired!: boolean;

  @ApiProperty({
    nullable: true,
    description: 'Short lived token to submit with the second factor; null when not required',
  })
  challengeToken!: string | null;

  @ApiProperty({
    type: AuthTokensResponseDto,
    nullable: true,
    description: 'The issued tokens; null when a second factor is still required',
  })
  tokens!: AuthTokensResponseDto | null;

  static fromResult(result: LoginResult): LoginResponseDto {
    const dto = new LoginResponseDto();
    if (result.status === 'TWO_FACTOR_REQUIRED') {
      dto.twoFactorRequired = true;
      dto.challengeToken = result.challengeToken;
      dto.tokens = null;
      return dto;
    }
    dto.twoFactorRequired = false;
    dto.challengeToken = null;
    dto.tokens = AuthTokensResponseDto.fromResult(result.tokens);
    return dto;
  }
}
