import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * HTTP request contract for family owner registration. The global ValidationPipe
 * rejects unknown fields and malformed values before the application layer runs;
 * the domain value objects then enforce the deeper rules.
 */
export class RegisterFamilyOwnerRequestDto {
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

  @ApiProperty({
    example: '+2348012345678',
    description: 'United States or Nigeria phone number in E.164, international or local form',
  })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: '12 Marina Road', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Apartment 4B', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Lagos', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: 'Lagos', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  state!: string;

  @ApiProperty({ example: '101233', maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ example: 'NG', enum: ['US', 'NG'] })
  @IsIn(['US', 'NG'])
  country!: string;

  @ApiProperty({
    example: 'S3curePass',
    minLength: 8,
    maxLength: 128,
    description: 'At least 8 characters with an uppercase letter, a lowercase letter and a digit',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
