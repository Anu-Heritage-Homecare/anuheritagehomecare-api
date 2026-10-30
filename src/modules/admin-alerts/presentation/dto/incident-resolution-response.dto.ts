import { ApiProperty } from '@nestjs/swagger';
import { IncidentResolutionResult } from '../../application/dto/incident-resolution.result';

/** The Incident Detail Resolution tab response. */
export class IncidentResolutionResponseDto implements IncidentResolutionResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() status!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty({ nullable: true }) summary!: string | null;
  @ApiProperty({ nullable: true }) actionsTaken!: string | null;
  @ApiProperty() followUpRequired!: boolean;
  @ApiProperty({ nullable: true }) followUpDate!: string | null;
  @ApiProperty({ nullable: true }) followUpDateLabel!: string | null;
  @ApiProperty({ nullable: true }) followUpNotes!: string | null;
  @ApiProperty({ nullable: true }) resolvedBy!: string | null;
  @ApiProperty({ nullable: true }) resolutionTimeLabel!: string | null;
  @ApiProperty() resolved!: boolean;
  @ApiProperty() generatedAt!: string;

  static fromResult(result: IncidentResolutionResult): IncidentResolutionResponseDto {
    return result;
  }
}
