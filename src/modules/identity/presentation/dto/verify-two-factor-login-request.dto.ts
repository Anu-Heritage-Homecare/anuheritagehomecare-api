import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyTwoFactorLoginRequestDto {
  @ApiProperty({ description: 'The short lived challenge token returned by login' })
  @IsString()
  @MinLength(1)
  challengeToken!: string;

  @ApiProperty({
    example: '123456',
    description: 'A 6 digit authenticator code, or one of the backup recovery codes',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  code!: string;
}
