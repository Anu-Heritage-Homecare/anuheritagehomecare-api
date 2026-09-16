import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency, OnboardingStage as PrismaStage } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { ONBOARDING_READ_MODEL, OnboardingReadModel } from '../ports/onboarding-read.port';
import { OnboardingPipelineResult, StageResult } from '../dto/onboarding-pipeline.result';

const STAGE_LABELS: Record<PrismaStage, string> = {
  NEW_REQUEST: 'New Request',
  PLAN_SELECTED: 'Plan Selected',
  PAYMENT_RECEIVED: 'Payment Received',
  PENDING_REVIEW: 'Pending Review',
  DOC_VERIFIED: 'Doc Verified',
  COORDINATOR_ASSIGNED: 'Coord Assigned',
  CAREGIVER_SCHEDULED: 'Caregiver Sched',
  SUB_ACTIVATED: 'Sub Activated',
};

/** Days of lifecycle events used to average stage dwell times. */
const TIMING_WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;

interface GetOnboardingPipelineCommand {
  currency: Currency;
}

/**
 * Assemble the Commercial Operations Pipeline and the Avg Activation Time KPI for
 * one market. Stage counts are current; the stage dwell times and activation time
 * are computed from recorded lifecycle events. Read only.
 */
@Injectable()
export class GetOnboardingPipelineUseCase {
  constructor(
    @Inject(ONBOARDING_READ_MODEL) private readonly reads: OnboardingReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetOnboardingPipelineCommand): Promise<OnboardingPipelineResult> {
    const now = this.clock.now();
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;
    const timingWindowStart = new Date(now.getTime() - TIMING_WINDOW_DAYS * DAY_MS);

    const [stages, activation] = await Promise.all([
      this.reads.pipeline(prismaCurrency, timingWindowStart),
      this.reads.activation(prismaCurrency, now),
    ]);

    return {
      currency: String(command.currency),
      generatedAt: now.toISOString(),
      activation: {
        avgDays: activation.avgDaysCurrent,
        trendPercent: percentChange(activation.avgDaysCurrent, activation.avgDaysPrevious),
        activatedThisPeriod: activation.activatedCurrent,
      },
      stages: stages.map((stage): StageResult => ({
        stage: String(stage.stage),
        label: STAGE_LABELS[stage.stage],
        count: stage.count,
        tasks: stage.tasks,
        avgHoursInStage:
          stage.avgMinutesInStage === null
            ? null
            : Math.round((stage.avgMinutesInStage / 60) * 10) / 10,
      })),
    };
  }
}

/** Percent change from previous to current, or null when either is missing or zero. */
function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
