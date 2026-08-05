import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * HTTP request contract for registering a client. First line of defence: the
 * global ValidationPipe rejects malformed payloads and strips unknown fields
 * before anything reaches the application layer.
 */
export class RegisterClientRequestDto {
  @ApiProperty({ example: 'Ada', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Obi', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'ada.obi@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  phone!: string;
}
