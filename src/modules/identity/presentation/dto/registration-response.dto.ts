import { ApiProperty } from '@nestjs/swagger';
import { RegistrationResult } from '../../application/dto/registration.result';

/** HTTP response contract returned after a successful registration. */
export class RegistrationResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ example: true, description: 'The email must be verified before login is allowed' })
  emailVerificationRequired!: boolean;

  static fromResult(result: RegistrationResult): RegistrationResponseDto {
    const dto = new RegistrationResponseDto();
    dto.userId = result.userId;
    dto.email = result.email;
    dto.emailVerificationRequired = result.emailVerificationRequired;
    return dto;
  }
}
