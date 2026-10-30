import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SosResponseEventKind } from '../../domain/sos-response-event-kind.enum';

const EVENT_KINDS = Object.values(SosResponseEventKind);

/** Acknowledge & Assign an emergency to a responder. */
export class AcknowledgeEmergencyDto {
  @ApiPropertyOptional({
    description: 'Who the response is assigned to, e.g. a regional supervisor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  assignedTo?: string;
}

/** Tick or un-tick a protocol step. */
export class ToggleProtocolStepDto {
  @ApiProperty() @IsBoolean() completed!: boolean;
}

/** Append a timeline entry (callback, geofence check, logged incident or note). */
export class LogResponseEventDto {
  @ApiProperty({ enum: EVENT_KINDS })
  @IsIn(EVENT_KINDS)
  kind!: SosResponseEventKind;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
}
