import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CommunicationChannel } from '../../domain/communication-channel.enum';
import { CommunicationOutcome } from '../../domain/communication-outcome.enum';

const CHANNELS = Object.values(CommunicationChannel);
const OUTCOMES = Object.values(CommunicationOutcome);

/** Record a documented communication regarding an incident. */
export class RecordCommunicationDto {
  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  channel!: CommunicationChannel;

  @ApiProperty({ enum: OUTCOMES })
  @IsIn(OUTCOMES)
  outcome!: CommunicationOutcome;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) contactName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) contactRole?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
