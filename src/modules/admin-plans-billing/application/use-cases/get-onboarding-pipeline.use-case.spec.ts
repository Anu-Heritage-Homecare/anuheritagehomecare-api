import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  ActivationView,
  OnboardingReadModel,
  StagePipelineView,
} from '../ports/onboarding-read.port';
import { GetOnboardingPipelineUseCase } from './get-onboarding-pipeline.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function stages(): StagePipelineView[] {
  return [
    { stage: 'NEW_REQUEST', count: 14, tasks: 4, avgMinutesInStage: 72 },
    { stage: 'SUB_ACTIVATED', count: 3, tasks: 0, avgMinutesInStage: null },
  ];
}

function activation(): ActivationView {
  return { avgDaysCurrent: 2.4, avgDaysPrevious: 2.5, activatedCurrent: 3 };
}

function useCase(): GetOnboardingPipelineUseCase {
  const reads: OnboardingReadModel = {
    pipeline: () => Promise.resolve(stages()),
    activation: () => Promise.resolve(activation()),
    verificationQueue: () => Promise.reject(new Error('unused')),
  };
  return new GetOnboardingPipelineUseCase(reads, clock);
}

describe('GetOnboardingPipelineUseCase', () => {
  it('labels stages and converts dwell minutes to hours', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    expect(result.stages[0].label).toBe('New Request');
    expect(result.stages[0].count).toBe(14);
    expect(result.stages[0].tasks).toBe(4);
    expect(result.stages[0].avgHoursInStage).toBe(1.2);
    expect(result.stages[1].label).toBe('Sub Activated');
    expect(result.stages[1].avgHoursInStage).toBeNull();
  });

  it('builds the activation KPI with a trend against the previous window', async () => {
    const result = await useCase().execute({ currency: Currency.UnitedStatesDollar });
    expect(result.activation.avgDays).toBe(2.4);
    expect(result.activation.activatedThisPeriod).toBe(3);
    // (2.4 - 2.5) / 2.5 * 100 = -4
    expect(result.activation.trendPercent).toBe(-4);
  });
});
