import { PayPeriod } from './pay-period.vo';

describe('PayPeriod', () => {
  const anchor = new Date('2026-07-01T00:00:00.000Z');

  function period(reference: string): PayPeriod {
    return PayPeriod.containing({
      reference: new Date(reference),
      anchor,
      lengthDays: 14,
      paydayOffsetDays: 1,
    });
  }

  it('derives the fortnight that contains the reference day', () => {
    const p = period('2026-07-10T09:00:00.000Z');

    expect(p.startDate.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(p.lastDay.toISOString().slice(0, 10)).toBe('2026-07-14');
    expect(p.payDay.toISOString().slice(0, 10)).toBe('2026-07-15');
    expect(p.totalDays).toBe(14);
  });

  it('reports elapsed days and progress through the period', () => {
    const p = period('2026-07-10T23:00:00.000Z');

    expect(p.elapsedDays(new Date('2026-07-10T23:00:00.000Z'))).toBe(10);
    expect(p.progressPercent(new Date('2026-07-10T23:00:00.000Z'))).toBe(71);
    expect(p.daysUntilPayday(new Date('2026-07-12T00:00:00.000Z'))).toBe(3);
  });

  it('rolls to the next period on the first day after payday', () => {
    const p = period('2026-07-15T00:00:00.000Z');

    expect(p.startDate.toISOString().slice(0, 10)).toBe('2026-07-15');
    expect(p.lastDay.toISOString().slice(0, 10)).toBe('2026-07-28');
  });
});
