import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, ValidateNested } from 'class-validator';
import { PreferencesResult } from '../../application/use-cases/get-preferences.use-case';

class NotificationPreferencesDto {
  @ApiProperty() @IsBoolean() push!: boolean;
  @ApiProperty() @IsBoolean() email!: boolean;
  @ApiProperty() @IsBoolean() sms!: boolean;
  @ApiProperty() @IsBoolean() visitUpdates!: boolean;
  @ApiProperty() @IsBoolean() careAlerts!: boolean;
  @ApiProperty() @IsBoolean() billingAlerts!: boolean;
  @ApiProperty() @IsBoolean() messageAlerts!: boolean;
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
}

/** HTTP response for the owner's preferences. */
export class PreferencesResponseDto {
  @ApiProperty({ type: NotificationPreferencesDto })
  notifications!: NotificationPreferencesDto;

  @ApiProperty({ example: 'en' })
  language!: string;

  static fromResult(result: PreferencesResult): PreferencesResponseDto {
    return Object.assign(new PreferencesResponseDto(), result);
  }
}
