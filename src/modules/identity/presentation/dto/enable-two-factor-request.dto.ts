import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class EnableTwoFactorRequestDto {
  @ApiProperty({
    example: '123456',
    description: 'The 6 digit code from the authenticator app for the pending secret',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6 digit authenticator code' })
  code!: string;
}
