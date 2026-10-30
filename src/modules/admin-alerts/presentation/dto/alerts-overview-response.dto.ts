import { ApiProperty } from '@nestjs/swagger';
import {
  AlertRowResult,
  AlertsOverviewCountsResult,
  AlertsOverviewKpisResult,
  AlertsOverviewResult,
} from '../../application/dto/alerts-overview.result';

class AlertsKpisDto implements AlertsOverviewKpisResult {
  @ApiProperty() activeAlerts!: number;
  @ApiProperty() highPriority!: number;
  @ApiProperty() critical!: number;
  @ApiProperty() openIncidents!: number;
  @ApiProperty() resolvedToday!: number;
}

class AlertsCountsDto implements AlertsOverviewCountsResult {
  @ApiProperty() all!: number;
  @ApiProperty() activeAlerts!: number;
  @ApiProperty() incidents!: number;
  @ApiProperty() emergencies!: number;
  @ApiProperty() resolved!: number;
}

class AlertRowDto implements AlertRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() type!: string;
  @ApiProperty() description!: string;
  @ApiProperty() source!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty() at!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() status!: string;
}

/** The Alerts and Incidents screen response. */
export class AlertsOverviewResponseDto implements AlertsOverviewResult {
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ type: AlertsKpisDto }) kpis!: AlertsKpisDto;
  @ApiProperty({ type: AlertsCountsDto }) counts!: AlertsCountsDto;
  @ApiProperty({ type: [AlertRowDto] }) items!: AlertRowDto[];

  static fromResult(result: AlertsOverviewResult): AlertsOverviewResponseDto {
    return result;
  }
}
