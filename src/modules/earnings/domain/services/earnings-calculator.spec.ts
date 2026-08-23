import { Currency } from '@shared/domain/currency.enum';
import { CaregiverPayRate } from '../caregiver-pay-rate.entity';
import { EarningsCalculator } from './earnings-calculator';

describe('EarningsCalculator', () => {
  const rate = CaregiverPayRate.create({
    id: 'rate-1',
    caregiverId: 'caregiver-1',
    currency: Currency.NigerianNaira,
    hourlyRateMinor: 1000, // 10.00 per hour
    overtimeMultiplierBps: 15000, // 1.5x
    regularHoursCap: 80,
    weekendBonusMinor: 500,
    taxRateBps: 1000, // 10%
  });

  it('splits regular and overtime, adds the weekend bonus and deducts tax', () => {
    const breakdown = EarningsCalculator.compute({
      rate,
      currency: Currency.NigerianNaira,
      workedMinutes: 82 * 60, // 82 hours: 80 regular + 2 overtime
      weekendVisits: 2,
    });

    expect(breakdown.regularPayMinor).toBe(80000);
    expect(breakdown.overtimePayMinor).toBe(3000); // 1500/hr overtime rate x 2h
    expect(breakdown.weekendBonusMinor).toBe(1000);
    expect(breakdown.grossMinor).toBe(84000);
    expect(breakdown.deductionsMinor).toBe(8400);
    expect(breakdown.netMinor).toBe(75600);
  });

  it('has no overtime when worked hours are within the cap', () => {
    const breakdown = EarningsCalculator.compute({
      rate,
      currency: Currency.NigerianNaira,
      workedMinutes: 40 * 60,
      weekendVisits: 0,
    });

    expect(breakdown.overtimeMinutes).toBe(0);
    expect(breakdown.overtimePayMinor).toBe(0);
  });

  it('estimates to zero when no rate is configured', () => {
    const breakdown = EarningsCalculator.compute({
      rate: null,
      currency: Currency.NigerianNaira,
      workedMinutes: 82 * 60,
      weekendVisits: 2,
    });

    expect(breakdown.grossMinor).toBe(0);
    expect(breakdown.netMinor).toBe(0);
    expect(breakdown.currency).toBe(Currency.NigerianNaira);
  });
});
