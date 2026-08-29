import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DisableTwoFactorRequestDto {
  @ApiProperty({
    example: 'S3curePass',
    description: 'The current password, required to lower the account security',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
