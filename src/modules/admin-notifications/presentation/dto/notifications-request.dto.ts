import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { NotificationChannel } from '../../domain/notification-channel.enum';

const MAX_MINUTES = 7 * 24 * 60;

/** Switch one notification type on or off. */
export class SetToggleRequestDto {
  @ApiProperty() @IsBoolean() enabled!: boolean;
}

/** Set the visit reminder timing rules (the Edit Rules action). */
export class UpdateVisitRemindersRequestDto {
  @ApiPropertyOptional({ minimum: 0, maximum: MAX_MINUTES, example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MINUTES)
  caregiverReminderMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_MINUTES, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MINUTES)
  familyNotificationMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_MINUTES, example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_MINUTES)
  coordinatorLateMinutes?: number;
}

/** Set the emergency alert routing (the Edit action). */
export class UpdateEmergencyAlertsRequestDto {
  @ApiPropertyOptional({ type: [String], description: 'Recipient role labels' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  recipients?: string[];

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ type: [String], description: 'Trigger keys from the catalog' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  triggers?: string[];
}

/** Set the SMS provider integration. */
export class UpdateSmsProviderRequestDto {
  @ApiPropertyOptional({ nullable: true, example: 'Termii' })
  @IsOptional()
  @ValidateIf((object: UpdateSmsProviderRequestDto) => object.name !== null)
  @IsString()
  @MaxLength(80)
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  connected?: boolean;
}
