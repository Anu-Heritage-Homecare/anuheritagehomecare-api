import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, ValidateNested } from 'class-validator';
import { PreferencesResult } from '../../application/use-cases/get-preferences.use-case';

class NotificationPreferencesDto {
  // Care Updates
  @ApiProperty() @IsBoolean() visitUpdates!: boolean;
  @ApiProperty() @IsBoolean() caregiverUpdates!: boolean;
  @ApiProperty() @IsBoolean() healthAlerts!: boolean;
  @ApiProperty() @IsBoolean() medicationReminders!: boolean;
  // Communications
  @ApiProperty() @IsBoolean() messages!: boolean;
  @ApiProperty() @IsBoolean() carePlanUpdates!: boolean;
  @ApiProperty() @IsBoolean() announcements!: boolean;
  // Billing and Payments
  @ApiProperty() @IsBoolean() invoicesAndPayments!: boolean;
  @ApiProperty() @IsBoolean() paymentReminders!: boolean;
  // Marketing
  @ApiProperty() @IsBoolean() marketingAndOffers!: boolean;
}

/** Request to replace the owner's notification and app preferences. */
export class UpdatePreferencesRequestDto {
  @ApiProperty({ type: NotificationPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications!: NotificationPreferencesDto;

  @ApiProperty({ example: 'en', enum: ['en'] })
  @IsIn(['en'])
  language!: string;

  @ApiProperty({ example: 'EMAIL', enum: ['EMAIL', 'PHONE', 'SMS'] })
  @IsIn(['EMAIL', 'PHONE', 'SMS'])
  preferredContactMethod!: string;
}

/** HTTP response for the owner's preferences. */
export class PreferencesResponseDto {
  @ApiProperty({ type: NotificationPreferencesDto })
  notifications!: NotificationPreferencesDto;

  @ApiProperty({ example: 'en' })
  language!: string;

  @ApiProperty({ example: 'EMAIL', enum: ['EMAIL', 'PHONE', 'SMS'] })
  preferredContactMethod!: string;

  static fromResult(result: PreferencesResult): PreferencesResponseDto {
    return Object.assign(new PreferencesResponseDto(), result);
  }
}
