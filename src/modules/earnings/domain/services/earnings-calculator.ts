import { Currency } from '@shared/domain/currency.enum';
import { CaregiverPayRate } from '../caregiver-pay-rate.entity';

const BASIS_POINTS = 10_000;
const MINUTES_PER_HOUR = 60;

/** A computed pay breakdown for a set of worked minutes, in integer minor units. */
export interface EarningsBreakdown {
  currency: Currency;
  regularMinutes: number;
  regularPayMinor: number;
  overtimeMinutes: number;
  overtimePayMinor: number;
  weekendVisits: number;
  weekendBonusMinor: number;
  grossMinor: number;
  deductionsMinor: number;
  netMinor: number;
}

/**
 * Turns worked time into pay, applying a caregiver's rate and rules: regular pay
 * up to the period cap, overtime beyond it at the multiplier, a flat bonus per
 * weekend visit, then deductions. All arithmetic is in integer minor units and
 * basis points, rounded once per line, so there is no floating point drift. With
 * no rate configured, everything is zero in the given currency.
 */
export class EarningsCalculator {
  static compute(params: {
    rate: CaregiverPayRate | null;
    currency: Currency;
    workedMinutes: number;
    weekendVisits: number;
  }): EarningsBreakdown {
    const { rate, currency } = params;
    if (rate === null) {
      return EarningsCalculator.zero(currency, params.weekendVisits);
    }

    const capMinutes = rate.regularHoursCap * MINUTES_PER_HOUR;
    const regularMinutes = Math.min(params.workedMinutes, capMinutes);
    const overtimeMinutes = Math.max(0, params.workedMinutes - capMinutes);

    const regularPayMinor = Math.round((rate.hourlyRateMinor * regularMinutes) / MINUTES_PER_HOUR);
    const overtimeRateMinor = Math.round(
      (rate.hourlyRateMinor * rate.overtimeMultiplierBps) / BASIS_POINTS,
    );
    const overtimePayMinor = Math.round((overtimeRateMinor * overtimeMinutes) / MINUTES_PER_HOUR);
    const weekendBonusMinor = params.weekendVisits * rate.weekendBonusMinor;

    const grossMinor = regularPayMinor + overtimePayMinor + weekendBonusMinor;
    const deductionsMinor = Math.round((grossMinor * rate.taxRateBps) / BASIS_POINTS);
    const netMinor = grossMinor - deductionsMinor;

    return {
      currency,
      regularMinutes,
      regularPayMinor,
      overtimeMinutes,
      overtimePayMinor,
      weekendVisits: params.weekendVisits,
      weekendBonusMinor,
      grossMinor,
      deductionsMinor,
      netMinor,
    };
  }

  private static zero(currency: Currency, weekendVisits: number): EarningsBreakdown {
    return {
      currency,
      regularMinutes: 0,
      regularPayMinor: 0,
      overtimeMinutes: 0,
      overtimePayMinor: 0,
      weekendVisits,
      weekendBonusMinor: 0,
      grossMinor: 0,
      deductionsMinor: 0,
      netMinor: 0,
    };
  }
}
