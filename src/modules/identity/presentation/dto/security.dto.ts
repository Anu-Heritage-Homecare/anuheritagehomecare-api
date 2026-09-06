import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  SecurityOverview,
  SecurityPreferences,
} from '../../application/use-cases/security.use-cases';

/** HTTP response for the Account Security overview. */
export class SecurityOverviewResponseDto {
  @ApiProperty() twoFactorEnabled!: boolean;
  @ApiProperty({ example: '2026-07-04T00:00:00.000Z' }) passwordChangedAt!: string;
  @ApiProperty() biometricEnabled!: boolean;
  @ApiProperty({ example: 15 }) sessionTimeoutMinutes!: number;
  @ApiProperty({ example: 3 }) activeDeviceCount!: number;

  static fromOverview(overview: SecurityOverview): SecurityOverviewResponseDto {
    return Object.assign(new SecurityOverviewResponseDto(), overview);
  }
}

/** Request to update the security preferences; either field may be sent alone. */
export class UpdateSecurityPreferencesRequestDto {
  @ApiProperty({ required: false, description: 'Face ID / biometric sign in toggle' })
  @IsOptional()
  @IsBoolean()
  biometricEnabled?: boolean;

  @ApiProperty({ required: false, example: 15, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  sessionTimeoutMinutes?: number;
}

/** HTTP response echoing the saved security preferences. */
export class SecurityPreferencesResponseDto {
  @ApiProperty() biometricEnabled!: boolean;
  @ApiProperty({ example: 15 }) sessionTimeoutMinutes!: number;

  static fromPreferences(preferences: SecurityPreferences): SecurityPreferencesResponseDto {
    return Object.assign(new SecurityPreferencesResponseDto(), preferences);
  }
}
