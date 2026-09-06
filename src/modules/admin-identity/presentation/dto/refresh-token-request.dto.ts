import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({ description: 'A valid admin refresh token' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
