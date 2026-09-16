import { ApiProperty } from '@nestjs/swagger';
import {
  CommandActionResult,
  FlexibleHoursResult,
  OperationsPanelResult,
} from '../../application/dto/operations-panel.result';

class FlexibleHoursDto implements FlexibleHoursResult {
  @ApiProperty() currency!: string;
  @ApiProperty() bookingsThisMonth!: number;
  @ApiProperty() hoursBookedThisMonth!: number;
  @ApiProperty() revenueThisMonthMinor!: number;
  @ApiProperty() upcomingBookings!: number;
  @ApiProperty() upcomingHours!: number;
  @ApiProperty({ nullable: true, type: Number }) remainingBalanceHours!: number | null;
}

class CommandActionDto implements CommandActionResult {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() available!: boolean;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
}

/** The Flexible Hours tracker and Immediate Command Actions response. */
export class OperationsPanelResponseDto implements OperationsPanelResult {
  @ApiProperty({ type: FlexibleHoursDto }) flexibleHours!: FlexibleHoursDto;
  @ApiProperty({ type: [CommandActionDto] }) commandActions!: CommandActionDto[];

  static fromResult(result: OperationsPanelResult): OperationsPanelResponseDto {
    return result;
  }
}
