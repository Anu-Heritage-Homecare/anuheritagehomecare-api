import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CareCircleMemberResult } from '../../application/use-cases/care-circle.use-cases';

/** Request to add a person to the owner's care circle. */
export class AddCareCircleMemberRequestDto {
  @ApiProperty({ example: 'John Pratama', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Son', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;

  @ApiPropertyOptional({ example: '+2348012345678', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'john@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

/** HTTP response for one care circle member. */
export class CareCircleMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  relationship!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  static fromResult(result: CareCircleMemberResult): CareCircleMemberResponseDto {
    return Object.assign(new CareCircleMemberResponseDto(), result);
  }
}
