import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({ description: 'The refresh token issued at login' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  refreshToken!: string;
}
