import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyEmailRequestDto {
  @ApiProperty({ example: 'ada.obi@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '123456', description: 'The numeric code sent by email' })
  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'code must be a numeric passcode' })
  code!: string;
}
