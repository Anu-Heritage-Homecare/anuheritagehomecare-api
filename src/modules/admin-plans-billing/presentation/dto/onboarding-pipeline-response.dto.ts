import { ApiProperty } from '@nestjs/swagger';
import {
  ActivationKpiResult,
  OnboardingPipelineResult,
  StageResult,
} from '../../application/dto/onboarding-pipeline.result';

class ActivationKpiDto implements ActivationKpiResult {
  @ApiProperty({ nullable: true, type: Number }) avgDays!: number | null;
  @ApiProperty({ nullable: true, type: Number }) trendPercent!: number | null;
  @ApiProperty() activatedThisPeriod!: number;
}

class StageDto implements StageResult {
  @ApiProperty() stage!: string;
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
  @ApiProperty() tasks!: number;
  @ApiProperty({ nullable: true, type: Number }) avgHoursInStage!: number | null;
}

/** The Commercial Operations Pipeline and Avg Activation Time KPI response. */
export class OnboardingPipelineResponseDto implements OnboardingPipelineResult {
  @ApiProperty() currency!: string;
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ type: ActivationKpiDto }) activation!: ActivationKpiDto;
  @ApiProperty({ type: [StageDto] }) stages!: StageDto[];

  static fromResult(result: OnboardingPipelineResult): OnboardingPipelineResponseDto {
    return result;
  }
}
