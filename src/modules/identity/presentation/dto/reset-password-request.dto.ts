import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @ApiProperty({ description: 'The reset token returned by verifying the reset code' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  resetToken!: string;

  @ApiProperty({
    example: 'S3curePass',
    minLength: 8,
    maxLength: 128,
    description: 'At least 8 characters with an uppercase letter, a lowercase letter and a digit',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
