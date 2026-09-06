import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginRequestDto {
  @ApiProperty({ example: 'ops.manager@anuheritagehomecare.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'S3curePassw0rd' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
