import { ApiProperty } from '@nestjs/swagger';
import { IncidentListResult, IncidentRowResult } from '../../application/dto/incident.result';

export class IncidentRowDto implements IncidentRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() incidentId!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) detail!: string | null;
  @ApiProperty() reporter!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty() at!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() status!: string;

  static fromResult(result: IncidentRowResult): IncidentRowDto {
    return result;
  }
}

/** The Incidents tab response. */
export class IncidentListResponseDto implements IncidentListResult {
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ type: [IncidentRowDto] }) items!: IncidentRowDto[];

  static fromResult(result: IncidentListResult): IncidentListResponseDto {
    return result;
  }
}
