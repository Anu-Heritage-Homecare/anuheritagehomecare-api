import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({
    example: 'TempPass1',
    description: 'The current password, including a temporary one issued at provisioning',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

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
