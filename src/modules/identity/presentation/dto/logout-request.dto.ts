import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty({ description: 'The refresh token to revoke' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  refreshToken!: string;
}
