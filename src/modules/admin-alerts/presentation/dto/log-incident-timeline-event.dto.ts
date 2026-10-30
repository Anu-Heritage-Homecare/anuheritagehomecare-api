import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IncidentTimelineEventKind } from '../../domain/incident-timeline-event-kind.enum';

const KINDS = Object.values(IncidentTimelineEventKind);

/** Append an entry to an incident's history timeline. */
export class LogIncidentTimelineEventDto {
  @ApiProperty({ enum: KINDS })
  @IsIn(KINDS)
  kind!: IncidentTimelineEventKind;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) title!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(500) description!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) actorName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) actorRole?: string;
}
