import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({ example: 'CurrentPassw0rd' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: 'BrandNewPassw0rd' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
