import { ApiProperty } from '@nestjs/swagger';
import {
  IncidentTimelineEntryResult,
  IncidentTimelineResult,
} from '../../application/dto/incident-timeline.result';

class IncidentTimelineEntryDto implements IncidentTimelineEntryResult {
  @ApiProperty() at!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty() dayLabel!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) actor!: string | null;
  @ApiProperty() kind!: string;
}

/** The Incident Detail Timeline tab response. */
export class IncidentTimelineResponseDto implements IncidentTimelineResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ type: [IncidentTimelineEntryDto] }) entries!: IncidentTimelineEntryDto[];
  @ApiProperty() generatedAt!: string;

  static fromResult(result: IncidentTimelineResult): IncidentTimelineResponseDto {
    return result;
  }
}
