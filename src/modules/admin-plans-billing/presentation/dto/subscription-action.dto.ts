import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SUBSCRIPTION_HOURS_ACTIONS,
  SubscriptionHoursAction,
} from '../../application/use-cases/subscription-hours-action.use-case';
import {
  SUBSCRIPTION_LIFECYCLE_ACTIONS,
  SubscriptionLifecycleAction,
} from '../../application/use-cases/subscription-lifecycle-action.use-case';
import {
  SUBSCRIPTION_ROLES,
  SubscriptionRole,
} from '../../application/use-cases/subscription-overlay-assignment.use-case';

const MAX_HOURS = 1000;

/** A subscription lifecycle action (pause, resume, auto renew, force renewal). */
export class SubscriptionLifecycleRequestDto {
  @ApiProperty({ enum: SUBSCRIPTION_LIFECYCLE_ACTIONS })
  @IsIn(SUBSCRIPTION_LIFECYCLE_ACTIONS)
  action!: SubscriptionLifecycleAction;
}

/** A flexible hours action on a subscription. */
export class SubscriptionHoursRequestDto {
  @ApiProperty({ enum: SUBSCRIPTION_HOURS_ACTIONS })
  @IsIn(SUBSCRIPTION_HOURS_ACTIONS)
  action!: SubscriptionHoursAction;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(MAX_HOURS) allocatedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(MAX_HOURS) usedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(MAX_HOURS) addHours?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  cycleEndsAt?: string;
}

/** Assign a coordinator or caregiver to a subscription. */
export class AssignSubscriptionRoleRequestDto {
  @ApiProperty({ enum: SUBSCRIPTION_ROLES })
  @IsIn(SUBSCRIPTION_ROLES)
  role!: SubscriptionRole;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  personId!: string;
}

/** Add a note to a subscription. */
export class AddSubscriptionNoteRequestDto {
  @ApiProperty() @IsString() @MaxLength(2000) body!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) authorName?: string;
}
