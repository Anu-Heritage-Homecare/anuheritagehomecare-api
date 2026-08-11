import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class RequestPasswordResetRequestDto {
  @ApiProperty({ example: 'ada.obi@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
