import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EarningsConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency, currencyForCountryCode } from '@shared/domain/currency.enum';
import {
  CAREGIVER_PAY_RATE_REPOSITORY,
  CaregiverPayRateRepository,
} from '../../domain/caregiver-pay-rate.repository';
import { PayPeriod } from '../../domain/value-objects/pay-period.vo';
import { EarningsCalculator } from '../../domain/services/earnings-calculator';
import { EarningsSummaryResult } from '../dto/earnings-summary.result';
import {
  CAREGIVER_TIMESHEET_DIRECTORY,
  CaregiverTimesheetDirectory,
  TimesheetEntry,
  TimesheetEntryKind,
} from '../ports/caregiver-timesheet.port';

export interface GetCurrentEarningsQuery {
  caregiverId: string;
  country: string;
}

interface HoursTotals {
  approvedMinutes: number;
  pendingMinutes: number;
  approvedWeekendVisits: number;
  pendingWeekendVisits: number;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Use case: the caregiver's earnings for the pay period they are currently in.
 *
 * The period is derived from the configured schedule; the caregiver's visits in
 * it are summed into approved hours (completed) and pending hours (still to be
 * done), and priced through their pay rate. Two nets are returned: what approved
 * hours are worth so far, and the projection if every pending hour is approved.
 * With no pay rate on file, the hours still show but the pay estimates to zero.
 */
@Injectable()
export class GetCurrentEarningsUseCase {
  constructor(
    @Inject(CAREGIVER_TIMESHEET_DIRECTORY) private readonly timesheet: CaregiverTimesheetDirectory,
    @Inject(CAREGIVER_PAY_RATE_REPOSITORY) private readonly rates: CaregiverPayRateRepository,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetCurrentEarningsQuery): Promise<EarningsSummaryResult> {
    const countryCurrency = currencyForCountryCode(query.country);
    const earnings = this.config.getOrThrow<EarningsConfig>('earnings');
    const now = this.clock.now();

    const period = PayPeriod.containing({
      reference: now,
      anchor: earnings.payPeriodAnchor,
      lengthDays: earnings.payPeriodDays,
      paydayOffsetDays: earnings.paydayOffsetDays,
    });

    const entries = await this.timesheet.listForPeriod(
      query.caregiverId,
      period.startDate,
      period.lastDay,
    );
    const totals = GetCurrentEarningsUseCase.tally(entries);

    const rate = await this.rates.findByCaregiver(query.caregiverId);
    const currency: Currency = rate?.currency ?? countryCurrency;

    const approved = EarningsCalculator.compute({
      rate,
      currency,
      workedMinutes: totals.approvedMinutes,
      weekendVisits: totals.approvedWeekendVisits,
    });
    const projected = EarningsCalculator.compute({
      rate,
      currency,
      workedMinutes: totals.approvedMinutes + totals.pendingMinutes,
      weekendVisits: totals.approvedWeekendVisits + totals.pendingWeekendVisits,
    });

    return {
      currency,
      payPeriod: {
        start: toIsoDate(period.startDate),
        end: toIsoDate(period.lastDay),
        payDay: toIsoDate(period.payDay),
        totalDays: period.totalDays,
        elapsedDays: period.elapsedDays(now),
        daysUntilPayday: period.daysUntilPayday(now),
        progressPercent: period.progressPercent(now),
      },
      hours: {
        approved: minutesToHours(totals.approvedMinutes),
        pending: minutesToHours(totals.pendingMinutes),
      },
      estimatedPayMinor: approved.netMinor,
      estimatedEarningsMinor: projected.netMinor,
      breakdown: {
        regularHours: minutesToHours(approved.regularMinutes),
        regularPayMinor: approved.regularPayMinor,
        overtimeHours: minutesToHours(approved.overtimeMinutes),
        overtimePayMinor: approved.overtimePayMinor,
        weekendVisits: approved.weekendVisits,
        weekendBonusMinor: approved.weekendBonusMinor,
        grossMinor: approved.grossMinor,
        deductionsMinor: approved.deductionsMinor,
        netMinor: approved.netMinor,
      },
    };
  }

  private static tally(entries: TimesheetEntry[]): HoursTotals {
    const totals: HoursTotals = {
      approvedMinutes: 0,
      pendingMinutes: 0,
      approvedWeekendVisits: 0,
      pendingWeekendVisits: 0,
    };
    for (const entry of entries) {
      const weekend = isWeekend(entry.scheduledDate);
      if (entry.kind === TimesheetEntryKind.Approved) {
        totals.approvedMinutes += entry.minutes;
        if (weekend) {
          totals.approvedWeekendVisits += 1;
        }
      } else {
        totals.pendingMinutes += entry.minutes;
        if (weekend) {
          totals.pendingWeekendVisits += 1;
        }
      }
    }
    return totals;
  }
}
