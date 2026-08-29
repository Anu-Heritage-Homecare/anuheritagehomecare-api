import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Currency } from '@shared/domain/currency.enum';
import { CaregiverPayRate } from '../../domain/caregiver-pay-rate.entity';
import { Payslip } from '../../domain/payslip.entity';
import { PayslipRepository } from '../../domain/payslip.repository';
import {
  FakeCaregiverTimesheetDirectory,
  InMemoryCaregiverPayRateRepository,
  fakeEarningsConfig,
  fixedClock,
} from '../../test-support/doubles';
import { TimesheetEntryKind } from '../ports/caregiver-timesheet.port';
import { GetPayslipUseCase } from './get-payslip.use-case';
import { ListPayslipsUseCase } from './list-payslips.use-case';
import { RunPayrollUseCase } from './run-payroll.use-case';

class InMemoryPayslipRepository implements PayslipRepository {
  private readonly byId = new Map<string, Payslip>();

  save(payslip: Payslip): Promise<void> {
    for (const [id, existing] of this.byId) {
      const samePeriod =
        existing.caregiverId === payslip.caregiverId &&
        existing.periodStart.getTime() === payslip.periodStart.getTime();
      if (samePeriod && id !== payslip.id) {
        this.byId.delete(id);
      }
    }
    this.byId.set(payslip.id, payslip);
    return Promise.resolve();
  }

  findById(id: string): Promise<Payslip | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }

  listForCaregiver(caregiverId: string): Promise<Payslip[]> {
    const list = [...this.byId.values()]
      .filter((payslip) => payslip.caregiverId === caregiverId)
      .sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime());
    return Promise.resolve(list);
  }
}

function incrementingIds(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `payslip-${n}`;
    },
  };
}

describe('payroll history and payslips', () => {
  let timesheet: FakeCaregiverTimesheetDirectory;
  let rates: InMemoryCaregiverPayRateRepository;
  let payslips: InMemoryPayslipRepository;
  let run: RunPayrollUseCase;
  let list: ListPayslipsUseCase;
  let get: GetPayslipUseCase;

  const reference = new Date('2026-07-05T00:00:00.000Z'); // inside the 01..14 period

  beforeEach(() => {
    timesheet = new FakeCaregiverTimesheetDirectory();
    rates = new InMemoryCaregiverPayRateRepository();
    payslips = new InMemoryPayslipRepository();
    run = new RunPayrollUseCase(
      timesheet,
      rates,
      payslips,
      incrementingIds(),
      fakeEarningsConfig(),
      fixedClock,
    );
    list = new ListPayslipsUseCase(payslips);
    get = new GetPayslipUseCase(payslips);

    rates.set(
      CaregiverPayRate.create({
        id: 'rate-1',
        caregiverId: 'caregiver-1',
        currency: Currency.NigerianNaira,
        hourlyRateMinor: 1000,
        overtimeMultiplierBps: 15000,
        regularHoursCap: 80,
        weekendBonusMinor: 500,
        taxRateBps: 1000,
      }),
    );

    // 40 approved weekday hours plus one approved weekend visit; the pending
    // entry must be ignored by payroll (only settled hours are paid).
    timesheet.add({
      kind: TimesheetEntryKind.Approved,
      scheduledDate: new Date('2026-07-06T00:00:00.000Z'), // Monday
      minutes: 40 * 60,
    });
    timesheet.add({
      kind: TimesheetEntryKind.Approved,
      scheduledDate: new Date('2026-07-04T00:00:00.000Z'), // Saturday
      minutes: 4 * 60,
    });
    timesheet.add({
      kind: TimesheetEntryKind.Pending,
      scheduledDate: new Date('2026-07-08T00:00:00.000Z'), // Wednesday
      minutes: 8 * 60,
    });
  });

  it('runs payroll for the period from approved hours only', async () => {
    const detail = await run.execute({ caregiverId: 'caregiver-1', country: 'NG', reference });

    expect(detail).toMatchObject({
      currency: 'NGN',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-14',
      payDay: '2026-07-15',
      workedHours: 44,
    });
    // 44 approved hours (all regular), plus a 500 weekend bonus, less 10% tax.
    expect(detail.breakdown).toMatchObject({
      regularPayMinor: 44000,
      overtimePayMinor: 0,
      weekendVisits: 1,
      weekendBonusMinor: 500,
      grossMinor: 44500,
      deductionsMinor: 4450,
      netMinor: 40050,
    });
  });

  it('lists a caregiver payslip after payroll runs', async () => {
    await run.execute({ caregiverId: 'caregiver-1', country: 'NG', reference });

    const history = await list.execute({ caregiverId: 'caregiver-1' });

    expect(history).toEqual([
      {
        id: 'payslip-1',
        currency: 'NGN',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-14',
        payDay: '2026-07-15',
        netMinor: 40050,
      },
    ]);
  });

  it('is idempotent per period, overwriting on a re-run', async () => {
    await run.execute({ caregiverId: 'caregiver-1', country: 'NG', reference });
    await run.execute({ caregiverId: 'caregiver-1', country: 'NG', reference });

    const history = await list.execute({ caregiverId: 'caregiver-1' });
    expect(history).toHaveLength(1);
  });

  it('fetches one payslip in full for its owner', async () => {
    const issued = await run.execute({ caregiverId: 'caregiver-1', country: 'NG', reference });

    const detail = await get.execute({ caregiverId: 'caregiver-1', payslipId: issued.id });
    expect(detail.breakdown.netMinor).toBe(40050);
  });

  it('hides a payslip from another caregiver, and 404s an unknown id', async () => {
    const issued = await run.execute({ caregiverId: 'caregiver-1', country: 'NG', reference });

    await expect(
      get.execute({ caregiverId: 'caregiver-2', payslipId: issued.id }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    await expect(
      get.execute({ caregiverId: 'caregiver-1', payslipId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
