import { ApiProperty } from '@nestjs/swagger';
import {
  OperationalAlertResult,
  OperationalAlertsResult,
} from '../../application/dto/operational-alerts.result';

class OperationalAlertDto implements OperationalAlertResult {
  @ApiProperty() key!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() title!: string;
  @ApiProperty() detail!: string;
  @ApiProperty({ nullable: true, type: Number }) count!: number | null;
  @ApiProperty() available!: boolean;
}

/** The Operational Alerts Queue response for one market. */
export class OperationalAlertsResponseDto implements OperationalAlertsResult {
  @ApiProperty() currency!: string;
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ type: [OperationalAlertDto] }) alerts!: OperationalAlertDto[];

  static fromResult(result: OperationalAlertsResult): OperationalAlertsResponseDto {
    return result;
  }
}
