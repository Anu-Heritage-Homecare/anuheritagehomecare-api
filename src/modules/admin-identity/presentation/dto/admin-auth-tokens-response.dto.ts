import { ApiProperty } from '@nestjs/swagger';
import { AdminAuthTokensResult } from '../../application/dto/admin-auth-tokens.result';
import { AdminProfileResponseDto } from './admin-profile-response.dto';

export class AdminAuthTokensResponseDto {
  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AdminProfileResponseDto })
  admin!: AdminProfileResponseDto;

  static fromResult(result: AdminAuthTokensResult): AdminAuthTokensResponseDto {
    const dto = new AdminAuthTokensResponseDto();
    dto.tokenType = result.tokenType;
    dto.accessToken = result.accessToken;
    dto.refreshToken = result.refreshToken;
    dto.admin = AdminProfileResponseDto.fromResult(result.admin);
    return dto;
  }
}
