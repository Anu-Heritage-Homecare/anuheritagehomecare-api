import { ApiProperty } from '@nestjs/swagger';
import {
  TwoFactorRecoveryCodesResult,
  TwoFactorSetupResult,
} from '../../application/dto/two-factor.result';

/** The provisioning material shown once when a user begins two factor setup. */
export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'Base32 secret for manual entry into an authenticator app' })
  secret!: string;

  @ApiProperty({ description: 'otpauth:// URI to render as a QR code' })
  otpauthUri!: string;

  static fromResult(result: TwoFactorSetupResult): TwoFactorSetupResponseDto {
    const dto = new TwoFactorSetupResponseDto();
    dto.secret = result.secret;
    dto.otpauthUri = result.otpauthUri;
    return dto;
  }
}

/** The backup recovery codes, returned once when two factor is enabled. */
export class TwoFactorRecoveryCodesResponseDto {
  @ApiProperty({
    type: [String],
    description: 'Single use backup codes; store them safely, they are shown only once',
  })
  recoveryCodes!: string[];

  static fromResult(result: TwoFactorRecoveryCodesResult): TwoFactorRecoveryCodesResponseDto {
    const dto = new TwoFactorRecoveryCodesResponseDto();
    dto.recoveryCodes = result.recoveryCodes;
    return dto;
  }
}
