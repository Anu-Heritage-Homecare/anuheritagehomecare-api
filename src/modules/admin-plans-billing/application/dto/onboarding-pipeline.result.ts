/** One stage card in the Commercial Operations Pipeline. */
export interface StageResult {
  stage: string;
  label: string;
  count: number;
  tasks: number;
  avgHoursInStage: number | null;
}

/** The Avg Activation Time KPI with its trend against the previous window. */
export interface ActivationKpiResult {
  avgDays: number | null;
  trendPercent: number | null;
  activatedThisPeriod: number;
}

export interface OnboardingPipelineResult {
  currency: string;
  generatedAt: string;
  activation: ActivationKpiResult;
  stages: StageResult[];
}
