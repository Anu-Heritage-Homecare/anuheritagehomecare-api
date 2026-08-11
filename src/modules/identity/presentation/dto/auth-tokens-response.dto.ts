import { ApiProperty } from '@nestjs/swagger';
import { AuthTokensResult } from '../../application/dto/auth-tokens.result';
import { UserProfileResponseDto } from './user-profile-response.dto';

/** HTTP response contract returned by login and token refresh. */
export class AuthTokensResponseDto {
  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Short lived JWT access token' })
  accessToken!: string;

  @ApiProperty({ description: 'Long lived rotating refresh token' })
  refreshToken!: string;

  @ApiProperty({ type: UserProfileResponseDto })
  user!: UserProfileResponseDto;

  static fromResult(result: AuthTokensResult): AuthTokensResponseDto {
    const dto = new AuthTokensResponseDto();
    dto.tokenType = result.tokenType;
    dto.accessToken = result.accessToken;
    dto.refreshToken = result.refreshToken;
    dto.user = UserProfileResponseDto.fromResult(result.user);
    return dto;
  }
}
