import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, ValidateNested } from 'class-validator';
import { PreferencesResult } from '../../application/use-cases/get-preferences.use-case';

const THEMES = ['LIGHT', 'DARK', 'SYSTEM'];
const DATE_FORMATS = ['MMM_DD_YYYY', 'DD_MM_YYYY', 'MM_DD_YYYY', 'YYYY_MM_DD'];
const TIME_FORMATS = ['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'];
const TEXT_SIZES = ['SMALL', 'MEDIUM', 'LARGE'];

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

  @ApiProperty({ example: 'LIGHT', enum: THEMES })
  @IsIn(THEMES)
  theme!: string;

  @ApiProperty({ example: 'MMM_DD_YYYY', enum: DATE_FORMATS })
  @IsIn(DATE_FORMATS)
  dateFormat!: string;

  @ApiProperty({ example: 'TWELVE_HOUR', enum: TIME_FORMATS })
  @IsIn(TIME_FORMATS)
  timeFormat!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  soundEnabled!: boolean;

  @ApiProperty({ example: 'MEDIUM', enum: TEXT_SIZES })
  @IsIn(TEXT_SIZES)
  textSize!: string;
}

/** HTTP response for the owner's preferences. */
export class PreferencesResponseDto {
  @ApiProperty({ type: NotificationPreferencesDto })
  notifications!: NotificationPreferencesDto;

  @ApiProperty({ example: 'en' })
  language!: string;

  @ApiProperty({ example: 'EMAIL', enum: ['EMAIL', 'PHONE', 'SMS'] })
  preferredContactMethod!: string;

  @ApiProperty({ example: 'LIGHT', enum: THEMES })
  theme!: string;

  @ApiProperty({ example: 'MMM_DD_YYYY', enum: DATE_FORMATS })
  dateFormat!: string;

  @ApiProperty({ example: 'TWELVE_HOUR', enum: TIME_FORMATS })
  timeFormat!: string;

  @ApiProperty({ example: true })
  soundEnabled!: boolean;

  @ApiProperty({ example: 'MEDIUM', enum: TEXT_SIZES })
  textSize!: string;

  static fromResult(result: PreferencesResult): PreferencesResponseDto {
    return Object.assign(new PreferencesResponseDto(), result);
  }
}
