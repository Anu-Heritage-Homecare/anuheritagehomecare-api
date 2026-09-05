import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { EmergencyContactResult } from '../../application/use-cases/emergency-contact.use-cases';

/** Request to set the owner's emergency contact. */
export class SetEmergencyContactRequestDto {
  @ApiProperty({ example: 'Grace Pratama', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '+2348012345678', maxLength: 20 })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'Sister', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;
}

/** HTTP response for the owner's emergency contact. */
export class EmergencyContactResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  relationship!: string;

  static fromResult(result: EmergencyContactResult): EmergencyContactResponseDto {
    return Object.assign(new EmergencyContactResponseDto(), result);
  }
}
