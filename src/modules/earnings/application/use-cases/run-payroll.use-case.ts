import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EarningsConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency, currencyForCountryCode } from '@shared/domain/currency.enum';
import {
  CAREGIVER_PAY_RATE_REPOSITORY,
  CaregiverPayRateRepository,
} from '../../domain/caregiver-pay-rate.repository';
import { Payslip } from '../../domain/payslip.entity';
import { PAYSLIP_REPOSITORY, PayslipRepository } from '../../domain/payslip.repository';
import { EarningsCalculator } from '../../domain/services/earnings-calculator';
import { PayPeriod } from '../../domain/value-objects/pay-period.vo';
import { PayslipDetailResult, toPayslipDetail } from '../dto/payslip.result';
import {
  CAREGIVER_TIMESHEET_DIRECTORY,
  CaregiverTimesheetDirectory,
  TimesheetEntry,
  TimesheetEntryKind,
} from '../ports/caregiver-timesheet.port';

export interface RunPayrollCommand {
  caregiverId: string;
  country: string;
  /** Any day within the closed period to run payroll for. */
  reference: Date;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Use case: run payroll for a caregiver's pay period, producing a payslip from
 * the approved (settled) hours in it. It reuses the same period, timesheet, pay
 * rate and calculator as the live earnings view, and persists an immutable
 * snapshot. Idempotent per caregiver and period: re-running overwrites the slip.
 *
 * This is the capture path for payroll history; it is triggered by the office
 * (an admin action or a scheduled job once a period closes), not by a caregiver.
 */
@Injectable()
export class RunPayrollUseCase {
  constructor(
    @Inject(CAREGIVER_TIMESHEET_DIRECTORY) private readonly timesheet: CaregiverTimesheetDirectory,
    @Inject(CAREGIVER_PAY_RATE_REPOSITORY) private readonly rates: CaregiverPayRateRepository,
    @Inject(PAYSLIP_REPOSITORY) private readonly payslips: PayslipRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RunPayrollCommand): Promise<PayslipDetailResult> {
    const countryCurrency = currencyForCountryCode(command.country);
    const earnings = this.config.getOrThrow<EarningsConfig>('earnings');

    const period = PayPeriod.containing({
      reference: command.reference,
      anchor: earnings.payPeriodAnchor,
      lengthDays: earnings.payPeriodDays,
      paydayOffsetDays: earnings.paydayOffsetDays,
    });

    const entries = await this.timesheet.listForPeriod(
      command.caregiverId,
      period.startDate,
      period.lastDay,
    );
    const settled = RunPayrollUseCase.tallyApproved(entries);

    const rate = await this.rates.findByCaregiver(command.caregiverId);
    const currency: Currency = rate?.currency ?? countryCurrency;

    const breakdown = EarningsCalculator.compute({
      rate,
      currency,
      workedMinutes: settled.minutes,
      weekendVisits: settled.weekendVisits,
    });

    const payslip = Payslip.issue({
      id: this.ids.generate(),
      caregiverId: command.caregiverId,
      currency,
      periodStart: period.startDate,
      periodEnd: period.lastDay,
      payDay: period.payDay,
      workedMinutes: settled.minutes,
      breakdown: {
        regularMinutes: breakdown.regularMinutes,
        regularPayMinor: breakdown.regularPayMinor,
        overtimeMinutes: breakdown.overtimeMinutes,
        overtimePayMinor: breakdown.overtimePayMinor,
        weekendVisits: breakdown.weekendVisits,
        weekendBonusMinor: breakdown.weekendBonusMinor,
        grossMinor: breakdown.grossMinor,
        deductionsMinor: breakdown.deductionsMinor,
        netMinor: breakdown.netMinor,
      },
      issuedAt: this.clock.now(),
    });
    await this.payslips.save(payslip);

    return toPayslipDetail(payslip);
  }

  private static tallyApproved(entries: TimesheetEntry[]): {
    minutes: number;
    weekendVisits: number;
  } {
    let minutes = 0;
    let weekendVisits = 0;
    for (const entry of entries) {
      if (entry.kind !== TimesheetEntryKind.Approved) {
        continue;
      }
      minutes += entry.minutes;
      if (isWeekend(entry.scheduledDate)) {
        weekendVisits += 1;
      }
    }
    return { minutes, weekendVisits };
  }
}
