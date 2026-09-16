import { ApiProperty } from '@nestjs/swagger';
import {
  PlanCardResult,
  PlanPerformanceCardsResult,
} from '../../application/dto/plan-performance-cards.result';

class PlanCardDto implements PlanCardResult {
  @ApiProperty() planType!: string;
  @ApiProperty() planName!: string;
  @ApiProperty() billingModel!: string;
  @ApiProperty() subscribers!: number;
  @ApiProperty() monthlyRevenueMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) unitPriceMinor!: number | null;
  @ApiProperty({ nullable: true, type: Number }) retentionPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) renewalPercent!: number | null;
  @ApiProperty({ nullable: true, type: String }) badge!: string | null;
}

/** The Care Plan Distribution and Performance cards response for one market. */
export class PlanPerformanceCardsResponseDto implements PlanPerformanceCardsResult {
  @ApiProperty() currency!: string;
  @ApiProperty({ type: [PlanCardDto] }) cards!: PlanCardDto[];

  static fromResult(result: PlanPerformanceCardsResult): PlanPerformanceCardsResponseDto {
    return result;
  }
}
